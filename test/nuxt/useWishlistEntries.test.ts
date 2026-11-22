import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody, type H3Event } from "h3";
import { ref } from "vue";
import type { WishlistEntry } from "../../shared/domain";
import { sameConfiguration, type WishlistSelection } from "~/utils/wishlist";
import { dishDetail, eur, pizzaWithSizes } from "../support/dishes";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  merge: vi.fn(),
  dish: vi.fn(),
}));
const isLoggedIn = ref(false);

registerEndpoint("/api/wishlist", {
  method: "GET",
  handler: () => mocks.list(),
});
registerEndpoint("/api/wishlist/entries", {
  method: "POST",
  handler: async (event: H3Event) => mocks.add(await readBody(event)),
});
registerEndpoint("/api/wishlist/entries/e1", {
  method: "DELETE",
  handler: () => mocks.remove("e1"),
});
registerEndpoint("/api/wishlist/merge", {
  method: "POST",
  handler: async (event: H3Event) => mocks.merge(await readBody(event)),
});
registerEndpoint("/api/wishlist/entries/gone-entry", {
  method: "DELETE",
  handler: () => mocks.remove("gone-entry"),
});
for (const id of ["p1", "v21-gross", "d21", "gone", "flaky", "refused"]) {
  registerEndpoint(`/api/menu/dishes/${id}`, () => mocks.dish(id));
}
mockNuxtImport("useCustomer", () => () => ({ isLoggedIn }));

const pizza: WishlistSelection = {
  configuration: {
    dishId: "p1",
    variantId: null,
    extraIds: ["x1"],
    removedIngredientIds: ["i-pilze"],
  },
  dishNumber: "21",
};

const entry = (id: string, selection = pizza): WishlistEntry => ({
  id,
  configuration: selection.configuration,
  dishNumber: selection.dishNumber,
  addedAt: "2026-11-22T12:00:00.000Z",
});

const stored = () => JSON.parse(localStorage.getItem("shopbite-wishlist")!);

const failure = (statusCode: number, code?: string) =>
  createError({ statusCode, data: code ? { code } : undefined });

const PIZZA_MIX = dishDetail({
  id: "p1",
  number: "21",
  name: "Pizza Mix",
  ingredients: [
    { id: "i-tomato", name: "Tomatensoße" },
    { id: "i-pilze", name: "Pilze" },
  ],
  extraGroups: [
    {
      id: "extras",
      name: "Extras",
      extras: [
        {
          id: "x1",
          number: "X1",
          name: "Extra Salami",
          price: eur(150),
          available: true,
        },
      ],
    },
  ],
});

describe("useWishlistEntries (#467, ADR 0001 step 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    isLoggedIn.value = false;
    const { entries, loaded } = useWishlistEntries();
    entries.value = [];
    loaded.value = false;
    useState("shopbite-wishlist-routes-missing").value = false;
    mocks.dish.mockImplementation((id: string) => {
      if (id === "p1") return PIZZA_MIX;
      if (id === "v21-gross" || id === "d21") {
        return pizzaWithSizes({
          selectedVariantId: id === "v21-gross" ? "v21-gross" : "v21-normal",
        });
      }
      if (id === "gone") throw failure(404, "not_found");
      if (id === "refused") throw failure(400, "invalid_value");
      throw failure(503, "backend_unavailable");
    });
  });

  it("compares configurations independent of order and duplicates", () => {
    expect(
      sameConfiguration(
        {
          dishId: "p1",
          variantId: null,
          extraIds: ["x2", "x1"],
          removedIngredientIds: ["a", "b"],
        },
        {
          dishId: "p1",
          variantId: null,
          extraIds: ["x1", "x2", "x1"],
          removedIngredientIds: ["b", "a"],
        },
      ),
    ).toBe(true);
    expect(
      sameConfiguration(pizza.configuration, {
        ...pizza.configuration,
        variantId: "v1",
      }),
    ).toBe(false);
  });

  it("keeps guest entries in local storage across a reload, the same dish twice when configured differently", async () => {
    const { add, find, entries, remove, load } = useWishlistEntries();

    await add(pizza);
    await add({
      ...pizza,
      configuration: { ...pizza.configuration, removedIngredientIds: [] },
    });
    // equal to the first
    await add({
      ...pizza,
      configuration: { ...pizza.configuration, extraIds: ["x1", "x1"] },
    });

    expect(entries.value).toHaveLength(2);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(stored()).toMatchObject({ version: 2 });
    expect(stored().entries).toHaveLength(2);

    await remove(find(pizza.configuration)!.id);
    entries.value = [];
    await load();
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]!.configuration.removedIngredientIds).toEqual([]);
  });

  it("converts the guest wishlist of 2.x with the dishes' sheets once", async () => {
    localStorage.setItem(
      "shopbite-wishlist",
      JSON.stringify([
        {
          id: "old1",
          productId: "p1",
          productNumber: "21",
          without: ["Pilze", "Rucola"],
          extras: ["X1"],
          createdAt: "2026-10-08T12:00:00Z",
        },
        {
          id: "old2",
          productId: "v21-gross",
          productNumber: "21-groß",
          without: [],
          extras: ["900"],
          createdAt: "2026-10-09T12:00:00Z",
        },
        {
          id: "old3",
          productId: "gone",
          productNumber: "5",
          without: [],
          extras: [],
          createdAt: "2026-10-07T12:00:00Z",
        },
        {
          id: "old4",
          productId: "flaky",
          productNumber: "6",
          without: [],
          extras: [],
          createdAt: "2026-10-06T12:00:00Z",
        },
      ]),
    );
    // a plain product id of the wishlist before #467
    localStorage.setItem("sw-wishlist-items", JSON.stringify(["d21"]));
    const { load, entries } = useWishlistEntries();

    await load();

    // the order of 2.x: the stored list, then the plain ids of before #467
    expect(
      entries.value.map((known) => [known.configuration, known.dishNumber]),
    ).toEqual([
      // a name the dish no longer has is left out, as the page did
      [
        {
          dishId: "p1",
          variantId: null,
          extraIds: ["x1"],
          removedIngredientIds: ["i-pilze"],
        },
        "21",
      ],
      [
        {
          dishId: "d21",
          variantId: "v21-gross",
          extraIds: ["x900"],
          removedIngredientIds: [],
        },
        "21-groß",
      ],
      // the plain dish, with no variant chosen
      [
        {
          dishId: "d21",
          variantId: null,
          extraIds: [],
          removedIngredientIds: [],
        },
        "21",
      ],
    ]);
    expect(entries.value.slice(0, 2).map((known) => known.id)).toEqual([
      "old1",
      "old2",
    ]);
    // a dish off the menu is dropped, one that could not be loaded stays
    expect(
      stored().pending.map((pending: { id: string }) => pending.id),
    ).toEqual(["old4"]);
    expect(localStorage.getItem("sw-wishlist-items")).toBeNull();

    mocks.dish.mockClear();
    entries.value = [];
    await load();
    // converted once: only the pending one is asked again
    expect([...new Set(mocks.dish.mock.calls.map(([id]) => id))]).toEqual([
      "flaky",
    ]);
    expect(entries.value).toHaveLength(3);
  });

  it("loads and saves a customer's entries through the BFF", async () => {
    isLoggedIn.value = true;
    mocks.list.mockResolvedValue([entry("e1")]);
    const plain: WishlistSelection = {
      ...pizza,
      configuration: { ...pizza.configuration, removedIngredientIds: [] },
    };
    mocks.add.mockResolvedValue(entry("e2", plain));
    mocks.remove.mockResolvedValue(null);
    const { load, add, entries, remove } = useWishlistEntries();

    await load();
    expect(entries.value.map((known) => known.id)).toEqual(["e1"]);

    await add(plain);
    expect(mocks.add).toHaveBeenCalledWith(plain.configuration);
    expect(entries.value.map((known) => known.id)).toEqual(["e2", "e1"]);

    await remove("e1");
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(entries.value.map((known) => known.id)).toEqual(["e2"]);
    expect(localStorage.getItem("shopbite-wishlist")).toBeNull();
  });

  it("moves guest entries into the account after the login", async () => {
    const { add, mergeGuestEntries, entries } = useWishlistEntries();
    await add(pizza);
    isLoggedIn.value = true;
    mocks.merge.mockResolvedValue([entry("e1")]);

    await mergeGuestEntries();

    expect(mocks.merge).toHaveBeenCalledWith({
      configurations: [pizza.configuration],
    });
    expect(entries.value.map((known) => known.id)).toEqual(["e1"]);
    expect(localStorage.getItem("shopbite-wishlist")).toBeNull();
  });

  it("loads the account's list after a login without guest entries", async () => {
    isLoggedIn.value = true;
    mocks.list.mockResolvedValue([entry("e1")]);
    const { mergeGuestEntries, entries } = useWishlistEntries();

    await mergeGuestEntries();

    expect(mocks.merge).not.toHaveBeenCalled();
    expect(entries.value.map((known) => known.id)).toEqual(["e1"]);
  });

  it("keeps the guest entries when the merge fails", async () => {
    const { add, mergeGuestEntries } = useWishlistEntries();
    await add(pizza);
    isLoggedIn.value = true;
    mocks.merge.mockImplementation(() => {
      throw failure(503, "backend_unavailable");
    });
    mocks.list.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await mergeGuestEntries();

    expect(stored().entries).toHaveLength(1);
  });

  it("stays in the browser when the backend keeps no wishlist", async () => {
    isLoggedIn.value = true;
    mocks.list.mockImplementation(() => {
      throw failure(501, "not_implemented");
    });
    const { load, add, entries } = useWishlistEntries();

    await load();
    await add(pizza);

    expect(entries.value).toHaveLength(1);
    expect(stored().entries).toHaveLength(1);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("drops a 2.x entry whose id the backend refuses", async () => {
    localStorage.setItem(
      "shopbite-wishlist",
      JSON.stringify([
        {
          id: "r1",
          productId: "refused",
          productNumber: "",
          without: [],
          extras: [],
          createdAt: "",
        },
      ]),
    );
    const { load, entries } = useWishlistEntries();
    await load();
    expect(entries.value).toEqual([]);
    expect(localStorage.getItem("shopbite-wishlist")).toBeNull();
  });

  it("keeps the converted entries when a guest saves while they still load", async () => {
    localStorage.setItem(
      "shopbite-wishlist",
      JSON.stringify([
        {
          id: "old1",
          productId: "p1",
          productNumber: "21",
          without: [],
          extras: [],
          createdAt: "2026-10-08T12:00:00Z",
        },
      ]),
    );
    const { load, add, entries } = useWishlistEntries();
    const loading = load();
    const adding = add({
      ...pizza,
      configuration: { ...pizza.configuration, extraIds: [] },
    });
    await Promise.all([loading, adding]);
    expect(entries.value).toHaveLength(2);
    expect(stored().entries).toHaveLength(2);
  });

  it("keeps a guest's wishlist at 100 entries", async () => {
    const { add, entries } = useWishlistEntries();
    for (let index = 0; index < 100; index++) {
      await add({
        configuration: {
          dishId: `d${index}`,
          variantId: null,
          extraIds: [],
          removedIngredientIds: [],
        },
        dishNumber: String(index),
      });
    }
    await expect(add(pizza)).rejects.toBeInstanceOf(WishlistFullError);
    expect(entries.value).toHaveLength(100);
  });

  it("merges the newest 100 guest entries", async () => {
    const { add, mergeGuestEntries } = useWishlistEntries();
    for (let index = 0; index < 100; index++) {
      await add({
        configuration: {
          dishId: `d${index}`,
          variantId: null,
          extraIds: [],
          removedIngredientIds: [],
        },
        dishNumber: String(index),
      });
    }
    // a 101st from 2.x storage
    const kept = stored();
    kept.pending = [];
    kept.entries.push({
      id: "x",
      configuration: {
        dishId: "d-old",
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
      },
      dishNumber: "1",
      addedAt: "2020-01-01T00:00:00Z",
    });
    localStorage.setItem("shopbite-wishlist", JSON.stringify(kept));
    isLoggedIn.value = true;
    mocks.merge.mockResolvedValue([]);
    await mergeGuestEntries();
    const { configurations } = mocks.merge.mock.calls[0]![0] as {
      configurations: { dishId: string }[];
    };
    expect(configurations).toHaveLength(100);
    expect(configurations[0]!.dishId).toBe("d99");
    expect(configurations.map((entry) => entry.dishId)).not.toContain("d-old");
  });

  it("treats an entry the backend no longer has as removed", async () => {
    isLoggedIn.value = true;
    mocks.list.mockResolvedValue([entry("gone-entry")]);
    mocks.remove.mockImplementation(() => {
      throw failure(404, "not_found");
    });
    const { load, remove, entries } = useWishlistEntries();
    await load();
    await remove("gone-entry");
    expect(entries.value).toEqual([]);
  });

  it("drops the answer of a merge when the customer switched meanwhile", async () => {
    const { add, mergeGuestEntries, entries } = useWishlistEntries();
    await add(pizza);
    isLoggedIn.value = true;
    mocks.merge.mockImplementation(() => {
      // another login or a logout in this tab while the merge ran
      switchAccount();
      return [entry("earlier-customer")];
    });
    entries.value = [];

    await mergeGuestEntries();

    expect(entries.value.map((known) => known.id)).not.toContain(
      "earlier-customer",
    );
  });
});
