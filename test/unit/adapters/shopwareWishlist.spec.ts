import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type VisitorStoreApi,
} from "../../../server/adapters/shopware";
import { dishConfiguration, isDomainError } from "../../../shared/domain";
import {
  BASIL,
  CHEESE,
  LARGE,
  MARGHERITA,
  OLIVES,
  SALAMI,
  TOMATO,
  testSession,
} from "../../contract/cart.contract";
import { REGISTRATION } from "../../contract/customer.contract";
import { RESTAURANT, STOREFRONT_URL } from "../../contract/ordering.contract";
import { GERMANY } from "../../contract/orderingFixtures";
import { fakeShopwareWishlist } from "../../contract/wishlistFixtures";

/**
 * What the wishlist contract cannot express: the plugin's records are
 * written exactly as by the 2.x storefront (the ordered product, removals
 * by name, extras by number, both sorted), entries the menu no longer
 * fully has, Shopware's own wishlist moving into the plugin, a plugin
 * without the wishlist routes.
 */
function setup(
  visitorApi?: (
    fake: ReturnType<typeof fakeShopwareWishlist>,
  ) => VisitorStoreApi,
) {
  const fake = fakeShopwareWishlist(RESTAURANT);
  const log = vi.fn();
  const backend = createShopwareBackend({
    storeApi: fake.storeApi,
    visitorApi: visitorApi?.(fake) ?? fake.visitorApi,
    countryId: GERMANY,
    storeUrl: "https://shop.example.com",
    timeZone: "Europe/Berlin",
    log,
  });
  return { fake, backend, log };
}

async function customer(backend: ReturnType<typeof setup>["backend"]) {
  const session = testSession();
  await backend.customer.register(session, REGISTRATION, STOREFRONT_URL);
  return session;
}

async function failure(call: () => Promise<unknown>) {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

const record = (item: {
  productId: string;
  without: string[];
  extras: string[];
}) => ({
  productId: item.productId,
  without: item.without,
  extras: item.extras,
});

describe("Shopware WishlistPort adapter (anti-corruption)", () => {
  it("writes the plugin's record as the 2.x storefront did", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);

    await backend.wishlist.addEntry(
      session,
      dishConfiguration({
        dishId: MARGHERITA,
        extraIds: [OLIVES, CHEESE],
        removedIngredientIds: [TOMATO, BASIL],
      }),
    );
    await backend.wishlist.addEntry(
      session,
      dishConfiguration({ dishId: SALAMI, variantId: LARGE }),
    );

    expect(fake.items.map(record)).toEqual([
      {
        productId: MARGHERITA,
        without: ["Basilikum", "Tomaten"],
        extras: ["X1", "X2"],
      },
      // the ordered variant, as the dish sheet saved it
      { productId: LARGE, without: [], extras: [] },
    ]);
    expect(fake.items.map((item) => item.productNumber)).toEqual(["21", "22G"]);
  });

  it("merges the guest's entries in one request of the plugin", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);

    await backend.wishlist.merge(session, [
      dishConfiguration({ dishId: MARGHERITA, removedIngredientIds: [BASIL] }),
      dishConfiguration({ dishId: SALAMI, variantId: LARGE }),
    ]);

    const merges = fake.requests.filter(
      (request) => request.path === "/shopbite/wishlist/merge",
    );
    expect(merges.map((request) => request.body)).toEqual([
      {
        items: [
          { productId: MARGHERITA, without: ["Basilikum"], extras: [] },
          { productId: LARGE, without: [], extras: [] },
        ],
      },
    ]);
  });

  it("reads an entry whose dish lost an ingredient or an extra without them", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    await backend.wishlist.addEntry(
      session,
      dishConfiguration({ dishId: MARGHERITA }),
    );
    // saved when the dish still had them
    fake.items[0]!.without = ["Basilikum", "Rucola"];
    fake.items[0]!.extras = ["X1", "X9"];

    const [entry] = await backend.wishlist.listEntries(session);

    expect(entry!.configuration).toEqual({
      dishId: MARGHERITA,
      variantId: null,
      extraIds: [CHEESE],
      removedIngredientIds: [BASIL],
    });
  });

  it("keeps an entry of a dish the menu no longer has under its own id", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    await backend.wishlist.addEntry(
      session,
      dishConfiguration({ dishId: MARGHERITA }),
    );
    fake.items[0]!.productId = "9e9e9e9e9e9e49e9a9e9e9e9e9e9e9e9";
    fake.items[0]!.without = ["Basilikum"];

    const [entry] = await backend.wishlist.listEntries(session);

    expect(entry).toMatchObject({
      configuration: {
        dishId: "9e9e9e9e9e9e49e9a9e9e9e9e9e9e9e9",
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
      },
      dishNumber: "21",
    });
  });

  it("moves the customer's Shopware wishlist into the plugin once", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    const id = fake.accounts[0]!.id;
    fake.core.set(id, [MARGHERITA, LARGE]);

    const entries = await backend.wishlist.listEntries(session);
    await backend.wishlist.listEntries(session);

    expect(entries.map((entry) => entry.configuration)).toEqual([
      expect.objectContaining({ dishId: MARGHERITA, variantId: null }),
      expect.objectContaining({ dishId: SALAMI, variantId: LARGE }),
    ]);
    expect(fake.core.get(id)).toEqual([]);
    expect(
      fake.requests.filter(
        (request) => request.path === "/shopbite/wishlist/merge",
      ),
    ).toHaveLength(1);
  });

  it("asks nothing without a logged-in customer", async () => {
    const { fake, backend } = setup();
    const before = fake.requests.length;

    const error = await failure(() =>
      backend.wishlist.listEntries(testSession()),
    );

    expect(isDomainError(error, "unauthenticated")).toBe(true);
    expect(fake.requests.length).toBe(before);
  });

  it("answers not_implemented when the plugin has no wishlist routes", async () => {
    const { backend } = setup((fake) => ({
      send: async (request) => {
        if (request.path.startsWith("/shopbite/wishlist")) {
          throw Object.assign(new Error("404"), {
            statusCode: 404,
            data: {
              errors: [{ status: "404", code: "FRAMEWORK__ROUTE_NOT_FOUND" }],
            },
          });
        }
        return fake.visitorApi.send(request);
      },
    }));
    const session = await customer(backend);

    const error = await failure(() => backend.wishlist.listEntries(session));

    expect(isDomainError(error, "not_implemented")).toBe(true);
  });

  it("carries no token in the error of a refused request", async () => {
    const { backend } = setup((fake) => ({
      send: async (request) => {
        if (request.path === "/shopbite/wishlist/add") {
          throw Object.assign(
            new Error(`500 for token ${request.contextToken}`),
            { statusCode: 500 },
          );
        }
        return fake.visitorApi.send(request);
      },
    }));
    const session = await customer(backend);
    const token = (await session.read())!;

    const error = (await failure(() =>
      backend.wishlist.addEntry(
        session,
        dishConfiguration({ dishId: MARGHERITA }),
      ),
    )) as Error & { cause?: Error };

    expect(isDomainError(error, "backend_unavailable")).toBe(true);
    expect(`${error.message} ${error.cause?.message}`).not.toContain(token);
  });

  it("asks Shopware's own wishlist once while it is empty, and lists after a move only once", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    const core = () =>
      fake.requests.filter((request) => request.path === "/customer/wishlist");

    await backend.wishlist.listEntries(session);
    await backend.wishlist.listEntries(session);
    expect(core()).toHaveLength(1);
  });

  it("moves Shopware's wishlist once for two reads at the same time", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    fake.core.set(fake.accounts[0]!.id, [MARGHERITA]);

    const [first, second] = await Promise.all([
      backend.wishlist.listEntries(session),
      backend.wishlist.listEntries(session),
    ]);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    const merges = fake.requests.filter(
      (request) => request.path === "/shopbite/wishlist/merge",
    );
    expect(merges).toHaveLength(1);
    // the move answered the list: no list request after it
    expect(
      fake.requests.filter((request) => request.path === "/shopbite/wishlist"),
    ).toHaveLength(0);
  });

  it("looks up all configurations of a merge at once and unknown dishes once", async () => {
    const { fake, backend } = setup();
    const session = await customer(backend);
    const unknown = Array.from({ length: 60 }, (_, index) =>
      dishConfiguration({ dishId: index.toString(16).padStart(32, "a") }),
    );
    const lookups = () =>
      fake.requests.filter((request) => request.path === "/product").length;
    const before = lookups();

    await backend.wishlist.merge(session, [
      ...unknown,
      dishConfiguration({ dishId: "no-shopware-id" }),
      dishConfiguration({ dishId: MARGHERITA, extraIds: [CHEESE] }),
      dishConfiguration({ dishId: SALAMI, variantId: LARGE }),
    ]);
    expect(lookups() - before).toBe(1);
    const ids = fake.requests
      .filter((request) => request.path === "/product")
      .at(-1)!.body!.ids as string[];
    expect(ids).not.toContain("no-shopware-id");

    await backend.wishlist.merge(session, unknown);
    expect(lookups() - before).toBe(1);
  });
});
