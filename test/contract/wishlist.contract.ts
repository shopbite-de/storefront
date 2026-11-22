import { describe, expect, it } from "vitest";
import {
  dishConfiguration,
  isDomainError,
  type DishConfiguration,
  type DomainErrorCode,
  type WishlistEntry,
} from "../../shared/domain";
import type { Backend, BackendSession } from "../../server/ports";
import {
  BASIL,
  CHEESE,
  COLA,
  LARGE,
  MARGHERITA,
  MOZZARELLA,
  OLIVES,
  SALAMI,
  TOMATO,
  testSession,
} from "./cart.contract";
import { REGISTRATION } from "./customer.contract";
import type { CustomerScenario } from "./customer.contract";
import { GUEST, RESTAURANT, STOREFRONT_URL } from "./ordering.contract";

/**
 * Guest & Account (ADR 0001, step 7): the logged-in customer's wishlist of
 * dish configurations, on one backend with the account (login, logout,
 * another customer) and the menu (what a configuration may name).
 */
export type WishlistFixture = Readonly<{
  adapter: string;
  create: (scenario: CustomerScenario) => { backend: Backend };
}>;

const OTTO = {
  ...REGISTRATION,
  email: "otto@example.com",
  firstName: "Otto",
  lastName: "Normal",
};

/** Margherita +Extra Käse +Oliven, ohne Basilikum. */
const MARGHERITA_CONFIGURED = dishConfiguration({
  dishId: MARGHERITA,
  extraIds: [CHEESE, OLIVES],
  removedIngredientIds: [BASIL],
});
const MARGHERITA_PLAIN = dishConfiguration({ dishId: MARGHERITA });
const SALAMI_LARGE = dishConfiguration({ dishId: SALAMI, variantId: LARGE });

async function rejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected the call to fail");
}

async function code(call: () => Promise<unknown>): Promise<DomainErrorCode> {
  const error = await rejection(call);
  if (!isDomainError(error)) throw error;
  return error.code;
}

/** What the guest sees of an entry: the configuration as sets. */
const summary = (entry: WishlistEntry) => ({
  dishId: entry.configuration.dishId,
  variantId: entry.configuration.variantId,
  extraIds: [...entry.configuration.extraIds].sort(),
  removedIngredientIds: [...entry.configuration.removedIngredientIds].sort(),
  dishNumber: entry.dishNumber,
});

const expected = (configuration: DishConfiguration, dishNumber: string) => ({
  dishId: configuration.dishId,
  variantId: configuration.variantId,
  extraIds: [...configuration.extraIds].sort(),
  removedIngredientIds: [...configuration.removedIngredientIds].sort(),
  dishNumber,
});

export function runWishlistContract(
  fixtures: readonly WishlistFixture[],
): void {
  for (const fixture of fixtures) {
    describe(`wishlist contract [${fixture.adapter}]`, () => {
      wishlistSuite((scenario = RESTAURANT) => fixture.create(scenario));
    });
  }
}

function wishlistSuite(
  given: (scenario?: CustomerScenario) => { backend: Backend },
): void {
  /** A logged-in customer of a new account and its session. */
  async function customer(backend: Backend, registration = REGISTRATION) {
    const session = testSession();
    await backend.customer.register(session, registration, STOREFRONT_URL);
    return session;
  }

  const ids = async (backend: Backend, session: BackendSession) =>
    (await backend.wishlist.listEntries(session)).map((entry) => entry.id);

  it("has no wishlist without a logged-in customer", async () => {
    const { backend } = given();
    const visitor = testSession();
    expect(await code(() => backend.wishlist.listEntries(visitor))).toBe(
      "unauthenticated",
    );
    expect(
      await code(() =>
        backend.wishlist.addEntry(visitor, MARGHERITA_CONFIGURED),
      ),
    ).toBe("unauthenticated");
    expect(await code(() => backend.wishlist.removeEntry(visitor, "e1"))).toBe(
      "unauthenticated",
    );
    expect(
      await code(() => backend.wishlist.merge(visitor, [MARGHERITA_PLAIN])),
    ).toBe("unauthenticated");
  });

  it("has no wishlist for a guest of the checkout", async () => {
    const { backend } = given();
    const guest = testSession();
    await backend.cart.addLine(guest, MARGHERITA_PLAIN, 1);
    await backend.checkout.registerGuest(guest, GUEST, STOREFRONT_URL);
    expect(await code(() => backend.wishlist.listEntries(guest))).toBe(
      "unauthenticated",
    );
    expect(
      await code(() => backend.wishlist.addEntry(guest, MARGHERITA_PLAIN)),
    ).toBe("unauthenticated");
  });

  it("is empty for a new customer", async () => {
    const { backend } = given();
    const session = await customer(backend);
    expect(await backend.wishlist.listEntries(session)).toEqual([]);
  });

  it("keeps a dish with its extras and removed ingredients", async () => {
    const { backend } = given();
    const session = await customer(backend);

    const entry = await backend.wishlist.addEntry(
      session,
      MARGHERITA_CONFIGURED,
    );

    expect(summary(entry)).toEqual(expected(MARGHERITA_CONFIGURED, "21"));
    expect(entry.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(entry.addedAt))).toBe(false);
    const listed = await backend.wishlist.listEntries(session);
    expect(listed.map(summary)).toEqual([
      expected(MARGHERITA_CONFIGURED, "21"),
    ]);
    expect(listed[0]!.id).toBe(entry.id);
  });

  it("keeps a variant under its dish with the variant's menu number", async () => {
    const { backend } = given();
    const session = await customer(backend);

    const entry = await backend.wishlist.addEntry(session, SALAMI_LARGE);

    expect(summary(entry)).toEqual(expected(SALAMI_LARGE, "22G"));
  });

  it("keeps an equal configuration once, whatever the order of its parts", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const first = await backend.wishlist.addEntry(
      session,
      MARGHERITA_CONFIGURED,
    );

    const again = await backend.wishlist.addEntry(
      session,
      dishConfiguration({
        dishId: MARGHERITA,
        extraIds: [OLIVES, CHEESE],
        removedIngredientIds: [BASIL],
      }),
    );

    expect(again.id).toBe(first.id);
    expect(await ids(backend, session)).toEqual([first.id]);
  });

  it("keeps the same dish twice when only the removals differ, newest first", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const withoutBasil = await backend.wishlist.addEntry(
      session,
      dishConfiguration({ dishId: MARGHERITA, removedIngredientIds: [BASIL] }),
    );
    const withoutTomato = await backend.wishlist.addEntry(
      session,
      dishConfiguration({ dishId: MARGHERITA, removedIngredientIds: [TOMATO] }),
    );
    const plain = await backend.wishlist.addEntry(session, MARGHERITA_PLAIN);

    expect(await ids(backend, session)).toEqual([
      plain.id,
      withoutTomato.id,
      withoutBasil.id,
    ]);
  });

  it("refuses what the menu does not offer", async () => {
    const { backend } = given();
    const session = await customer(backend);

    expect(
      await code(() =>
        backend.wishlist.addEntry(
          session,
          dishConfiguration({ dishId: "0f0f0f0f0f0f40f0a0f0f0f0f0f0f0f0" }),
        ),
      ),
    ).toBe("dish_unavailable");
    // a variant of another dish
    expect(
      await code(() =>
        backend.wishlist.addEntry(
          session,
          dishConfiguration({ dishId: MARGHERITA, variantId: LARGE }),
        ),
      ),
    ).toBe("invalid_value");
    // an extra the dish does not offer
    expect(
      await code(() =>
        backend.wishlist.addEntry(
          session,
          dishConfiguration({ dishId: COLA, extraIds: [CHEESE] }),
        ),
      ),
    ).toBe("invalid_value");
    // a main ingredient the dish does not have
    expect(
      await code(() =>
        backend.wishlist.addEntry(
          session,
          dishConfiguration({ dishId: SALAMI, removedIngredientIds: [BASIL] }),
        ),
      ),
    ).toBe("invalid_value");
    expect(await backend.wishlist.listEntries(session)).toEqual([]);
  });

  it("removes an entry", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const kept = await backend.wishlist.addEntry(session, MARGHERITA_PLAIN);
    const removed = await backend.wishlist.addEntry(session, SALAMI_LARGE);

    await backend.wishlist.removeEntry(session, removed.id);

    expect(await ids(backend, session)).toEqual([kept.id]);
    expect(
      await code(() => backend.wishlist.removeEntry(session, removed.id)),
    ).toBe("not_found");
  });

  it("never shows or removes another customer's entries", async () => {
    const { backend } = given();
    const erika = await customer(backend);
    const otto = await customer(backend, OTTO);
    const entry = await backend.wishlist.addEntry(erika, MARGHERITA_PLAIN);

    expect(await backend.wishlist.listEntries(otto)).toEqual([]);
    expect(await code(() => backend.wishlist.removeEntry(otto, entry.id))).toBe(
      "not_found",
    );
    expect(await ids(backend, erika)).toEqual([entry.id]);
  });

  it("keeps the wishlist with the account over a logout", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const entry = await backend.wishlist.addEntry(session, SALAMI_LARGE);

    await backend.customer.logout(session);
    expect(await code(() => backend.wishlist.listEntries(session))).toBe(
      "unauthenticated",
    );

    await backend.customer.login(
      session,
      REGISTRATION.email,
      REGISTRATION.password,
    );
    expect(await ids(backend, session)).toEqual([entry.id]);
  });

  it("opens nothing with the state from before a logout", async () => {
    const { backend } = given();
    const session = await customer(backend);
    await backend.wishlist.addEntry(session, MARGHERITA_PLAIN);
    const before = await session.read();

    await backend.customer.logout(session);

    const replayed = testSession(before);
    expect(await code(() => backend.wishlist.listEntries(replayed))).toBe(
      "unauthenticated",
    );
  });

  it("merges a guest's configurations after the login, newest first", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const saved = await backend.wishlist.addEntry(session, MARGHERITA_PLAIN);

    const merged = await backend.wishlist.merge(session, [
      SALAMI_LARGE,
      // equal to the saved one
      dishConfiguration({ dishId: MARGHERITA }),
      // taken off the menu
      dishConfiguration({ dishId: "0f0f0f0f0f0f40f0a0f0f0f0f0f0f0f0" }),
      MARGHERITA_CONFIGURED,
      // twice in the guest's list
      SALAMI_LARGE,
    ]);

    expect(merged.map(summary)).toEqual([
      expected(SALAMI_LARGE, "22G"),
      expected(MARGHERITA_CONFIGURED, "21"),
      expected(MARGHERITA_PLAIN, "21"),
    ]);
    expect(merged[2]!.id).toBe(saved.id);
    expect((await backend.wishlist.listEntries(session)).map(summary)).toEqual(
      merged.map(summary),
    );
  });

  it("merges nothing into an empty list without failing", async () => {
    const { backend } = given();
    const session = await customer(backend);
    expect(await backend.wishlist.merge(session, [])).toEqual([]);
  });

  it("leaves out configurations with parts the dish no longer has", async () => {
    const { backend } = given();
    const session = await customer(backend);

    const merged = await backend.wishlist.merge(session, [
      dishConfiguration({ dishId: COLA, extraIds: [CHEESE] }),
      dishConfiguration({ dishId: SALAMI, removedIngredientIds: [MOZZARELLA] }),
      MARGHERITA_PLAIN,
    ]);

    expect(merged.map(summary)).toEqual([expected(MARGHERITA_PLAIN, "21")]);
  });

  it("answers values a caller cannot change", async () => {
    const { backend } = given();
    const session = await customer(backend);
    const entry = await backend.wishlist.addEntry(
      session,
      MARGHERITA_CONFIGURED,
    );
    const listed = await backend.wishlist.listEntries(session);

    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.configuration.extraIds)).toBe(true);
    expect(Object.isFrozen(listed)).toBe(true);
    expect(Object.isFrozen(listed[0])).toBe(true);
  });
}
