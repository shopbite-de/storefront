import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { ApiClientError } from "@shopware/api-client";
import {
  isSameConfiguration,
  normalizeWishlistList,
} from "~/composables/useWishlistEntries";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
const isLoggedIn = ref(false);

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke },
}));
mockNuxtImport("useUser", () => () => ({ isLoggedIn }));

function missingRoute() {
  const error = Object.create(ApiClientError.prototype) as ApiClientError<{
    errors: [];
  }>;
  Object.defineProperty(error, "status", { value: 404 });
  return error;
}

const pizza = {
  productId: "p1",
  productNumber: "21",
  without: ["Pilze"],
  extras: ["X1"],
};

function remoteEntry(id: string, configuration = pizza) {
  return { id, createdAt: "2026-10-08T12:00:00Z", ...configuration };
}

describe("useWishlistEntries (#467)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    isLoggedIn.value = false;
    const { entries, loaded } = useWishlistEntries();
    entries.value = [];
    loaded.value = false;
    useState("shopbite-wishlist-routes-missing").value = false;
    useState("shopbite-wishlist-core-migrated").value = false;
  });

  it("compares configurations independent of order and duplicates", () => {
    expect(normalizeWishlistList([" b", "a", "b", ""])).toEqual(["a", "b"]);
    expect(
      isSameConfiguration(
        { productId: "p1", without: ["Pilze", "Käse"], extras: ["X2", "X1"] },
        { productId: "p1", without: ["Käse", "Pilze"], extras: ["X1", "X2"] },
      ),
    ).toBe(true);
    expect(isSameConfiguration(pizza, { ...pizza, extras: ["X1", "X2"] })).toBe(
      false,
    );
  });

  it("keeps guest entries in local storage, the same dish twice when configured differently", async () => {
    const { add, find, entries, remove, load } = useWishlistEntries();

    await add(pizza);
    await add({ ...pizza, without: [] });
    await add({ ...pizza, without: ["Pilze"] }); // same as the first

    expect(entries.value).toHaveLength(2);
    expect(invoke).not.toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem("shopbite-wishlist")!);
    expect(stored).toHaveLength(2);

    await remove(find(pizza)!.id);
    entries.value = [];
    await load();
    expect(entries.value).toHaveLength(1);
    expect(entries.value[0]!.without).toEqual([]);
  });

  it("turns the product ids of the old guest wishlist into entries", async () => {
    localStorage.setItem("sw-wishlist-items", JSON.stringify(["p9"]));
    const { load, entries } = useWishlistEntries();

    await load();

    expect(entries.value).toMatchObject([
      { productId: "p9", without: [], extras: [] },
    ]);
  });

  it("loads and saves a customer's entries through the plugin", async () => {
    isLoggedIn.value = true;
    invoke.mockImplementation(async (operation: string) => {
      if (operation.startsWith("shopbite.wishlist.list"))
        return { data: { elements: [remoteEntry("e1")] } };
      if (operation.startsWith("shopbite.wishlist.add"))
        return { data: remoteEntry("e2", { ...pizza, without: [] }) };
      if (operation.startsWith("readCustomerWishlist"))
        return { data: { products: { elements: [] } } };
      return { data: undefined };
    });
    const { load, add, entries, remove } = useWishlistEntries();

    await load();
    expect(entries.value.map((entry) => entry.id)).toEqual(["e1"]);

    await add({ ...pizza, without: [] });
    expect(invoke).toHaveBeenCalledWith(
      "shopbite.wishlist.add post /shopbite/wishlist/add",
      { body: { productId: "p1", without: [], extras: ["X1"] } },
    );
    expect(entries.value.map((entry) => entry.id)).toEqual(["e2", "e1"]);

    await remove("e1");
    expect(invoke).toHaveBeenCalledWith(
      "shopbite.wishlist.delete delete /shopbite/wishlist/{id}",
      { pathParams: { id: "e1" } },
    );
    expect(localStorage.getItem("shopbite-wishlist")).toBeNull();
  });

  it("moves the Shopware wishlist of a customer into the plugin once", async () => {
    isLoggedIn.value = true;
    let stored: ReturnType<typeof remoteEntry>[] = [];
    let core = [{ id: "old" }];
    invoke.mockImplementation(async (operation: string) => {
      if (operation.startsWith("shopbite.wishlist.list"))
        return { data: { elements: stored } };
      if (operation.startsWith("readCustomerWishlist"))
        return { data: { products: { elements: core } } };
      if (operation.startsWith("shopbite.wishlist.merge")) {
        stored = [
          remoteEntry("e3", {
            productId: "old",
            productNumber: "5",
            without: [],
            extras: [],
          }),
        ];
        return { data: { elements: stored } };
      }
      if (operation.startsWith("deleteProductOnWishlist")) core = [];
      return { data: undefined };
    });
    const { load, entries } = useWishlistEntries();

    await load();
    await load();

    expect(entries.value.map((entry) => entry.id)).toEqual(["e3"]);
    expect(
      invoke.mock.calls.filter(([operation]) =>
        operation.startsWith("readCustomerWishlist"),
      ),
    ).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith(
      "deleteProductOnWishlist delete /customer/wishlist/delete/{productId}",
      { pathParams: { productId: "old" } },
    );
  });

  it("moves guest entries into the account after the login", async () => {
    const { add, mergeGuestEntries, entries } = useWishlistEntries();
    await add(pizza);
    isLoggedIn.value = true;
    invoke.mockImplementation(async (operation: string) => {
      if (operation.startsWith("shopbite.wishlist.merge"))
        return { data: { elements: [remoteEntry("e1")] } };
      if (operation.startsWith("readCustomerWishlist"))
        return { data: { products: { elements: [] } } };
      return { data: undefined };
    });

    await mergeGuestEntries();

    expect(invoke).toHaveBeenCalledWith(
      "shopbite.wishlist.merge post /shopbite/wishlist/merge",
      {
        body: {
          items: [{ productId: "p1", without: ["Pilze"], extras: ["X1"] }],
        },
      },
    );
    expect(entries.value.map((entry) => entry.id)).toEqual(["e1"]);
    expect(localStorage.getItem("shopbite-wishlist")).toBeNull();
  });

  it("stays in the browser when the backend has no wishlist routes", async () => {
    isLoggedIn.value = true;
    invoke.mockRejectedValue(missingRoute());
    const { load, add, entries } = useWishlistEntries();

    await load();
    await add(pizza);

    expect(entries.value).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("shopbite-wishlist")!)).toHaveLength(
      1,
    );
    expect(
      invoke.mock.calls.filter(([operation]) =>
        operation.startsWith("shopbite.wishlist.add"),
      ),
    ).toHaveLength(0);
  });
});
