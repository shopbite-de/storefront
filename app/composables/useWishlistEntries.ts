import { ApiClientError } from "@shopware/api-client";

/**
 * The wishlist with configured dishes (#467). An entry is a dish as it was
 * configured in the product sheet: the product (variant), the deselected
 * main ingredients and the extras, i.e. the quick view configuration of the
 * URL (#411). The same dish can be saved twice with different
 * configurations.
 *
 * Logged-in customers keep their entries in the ShopBite plugin
 * (`/store-api/shopbite/wishlist`, entity `shopbite_wishlist_item`), guests
 * in local storage; on login the guest entries move into the account. A
 * backend without these routes (older plugin) answers 404, then the
 * entries stay in the browser for customers too.
 */
export type WishlistConfiguration = {
  productId: string;
  productNumber: string;
  without: string[];
  extras: string[];
};

export type WishlistEntry = WishlistConfiguration & {
  id: string;
  createdAt: string;
};

const STORAGE_KEY = "shopbite-wishlist";
// product ids of the wishlist before #467 (`useLocalWishlist` of the
// Shopware composables)
const LEGACY_STORAGE_KEY = "sw-wishlist-items";

/** Trimmed, unique and sorted, so two configurations can be compared. */
export function normalizeWishlistList(list: readonly string[] = []): string[] {
  return [...new Set(list.map((entry) => entry.trim()).filter(Boolean))].sort();
}

export function isSameConfiguration(
  a: Pick<WishlistConfiguration, "productId" | "without" | "extras">,
  b: Pick<WishlistConfiguration, "productId" | "without" | "extras">,
): boolean {
  return (
    a.productId === b.productId &&
    normalizeWishlistList(a.without).join("\n") ===
      normalizeWishlistList(b.without).join("\n") &&
    normalizeWishlistList(a.extras).join("\n") ===
      normalizeWishlistList(b.extras).join("\n")
  );
}

function isWishlistEntry(value: unknown): value is WishlistEntry {
  const entry = value as Partial<WishlistEntry> | null;
  return (
    !!entry &&
    typeof entry.id === "string" &&
    typeof entry.productId === "string" &&
    Array.isArray(entry.without) &&
    Array.isArray(entry.extras)
  );
}

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function newLocalEntry(configuration: WishlistConfiguration): WishlistEntry {
  return {
    id: crypto.randomUUID().replaceAll("-", ""),
    productId: configuration.productId,
    productNumber: configuration.productNumber,
    without: normalizeWishlistList(configuration.without),
    extras: normalizeWishlistList(configuration.extras),
    createdAt: new Date().toISOString(),
  };
}

/** Guest entries, including the plain product ids saved before #467. */
function readLocalEntries(): WishlistEntry[] {
  const stored = readStorage(STORAGE_KEY);
  const entries = Array.isArray(stored) ? stored.filter(isWishlistEntry) : [];
  const legacy = readStorage(LEGACY_STORAGE_KEY);
  if (Array.isArray(legacy)) {
    for (const productId of legacy) {
      if (typeof productId !== "string") continue;
      const plain = { productId, productNumber: "", without: [], extras: [] };
      if (!entries.some((entry) => isSameConfiguration(entry, plain))) {
        entries.push(newLocalEntry(plain));
      }
    }
  }
  return entries;
}

function writeLocalEntries(entries: WishlistEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // private mode or blocked storage: the list lives for this visit only
  }
}

function clearLocalEntries() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // nothing stored
  }
}

function isMissingRoute(error: unknown) {
  return error instanceof ApiClientError && error.status === 404;
}

export function useWishlistEntries() {
  const { apiClient } = useShopwareContext();
  const { isLoggedIn } = useUser();

  const entries = useState<WishlistEntry[]>(
    "shopbite-wishlist-entries",
    () => [],
  );
  const loaded = useState("shopbite-wishlist-loaded", () => false);
  // the backend has no wishlist routes (plugin older than #467)
  const routesMissing = useState(
    "shopbite-wishlist-routes-missing",
    () => false,
  );
  const coreMigrated = useState("shopbite-wishlist-core-migrated", () => false);

  const remote = computed(() => isLoggedIn.value && !routesMissing.value);
  const count = computed(() => entries.value.length);

  /**
   * The Shopware wishlist of a customer from before #467 holds plain product
   * ids: they become entries without configuration and are removed there,
   * so they do not come back after the customer deleted them.
   */
  async function migrateCoreWishlist() {
    if (coreMigrated.value) return;
    coreMigrated.value = true;
    try {
      const { data } = await apiClient.invoke(
        "readCustomerWishlist post /customer/wishlist",
        { body: { limit: 100 } },
      );
      const productIds = data.products.elements.map((product) => product.id);
      if (!productIds.length) return;
      const merged = await apiClient.invoke(
        "shopbite.wishlist.merge post /shopbite/wishlist/merge",
        { body: { items: productIds.map((productId) => ({ productId })) } },
      );
      entries.value = merged.data.elements;
      await Promise.all(
        productIds.map((productId) =>
          apiClient.invoke(
            "deleteProductOnWishlist delete /customer/wishlist/delete/{productId}",
            { pathParams: { productId } },
          ),
        ),
      );
    } catch {
      // no Shopware wishlist (404) or the wishlist is disabled (403)
    }
  }

  async function load() {
    if (!import.meta.client) return;
    if (remote.value) {
      try {
        const { data } = await apiClient.invoke(
          "shopbite.wishlist.list post /shopbite/wishlist",
          {},
        );
        entries.value = data.elements;
        loaded.value = true;
        await migrateCoreWishlist();
        return;
      } catch (error) {
        if (!isMissingRoute(error)) {
          console.error("[wishlist][load]", error);
          return;
        }
        routesMissing.value = true;
      }
    }
    entries.value = readLocalEntries();
    loaded.value = true;
  }

  /** Moves the guest entries into the account, right after the login. */
  async function mergeGuestEntries() {
    if (!import.meta.client || !remote.value) return load();
    const local = readLocalEntries();
    if (!local.length) return load();
    try {
      const { data } = await apiClient.invoke(
        "shopbite.wishlist.merge post /shopbite/wishlist/merge",
        {
          body: {
            items: local.map(({ productId, without, extras }) => ({
              productId,
              without,
              extras,
            })),
          },
        },
      );
      entries.value = data.elements;
      loaded.value = true;
      clearLocalEntries();
      await migrateCoreWishlist();
    } catch (error) {
      if (isMissingRoute(error)) routesMissing.value = true;
      else console.error("[wishlist][mergeGuestEntries]", error);
      await load();
    }
  }

  function find(configuration: Omit<WishlistConfiguration, "productNumber">) {
    return entries.value.find((entry) =>
      isSameConfiguration(entry, configuration),
    );
  }

  async function add(configuration: WishlistConfiguration) {
    if (find(configuration)) return;
    if (remote.value) {
      const { data } = await apiClient.invoke(
        "shopbite.wishlist.add post /shopbite/wishlist/add",
        {
          body: {
            productId: configuration.productId,
            without: configuration.without,
            extras: configuration.extras,
          },
        },
      );
      if (!entries.value.some((entry) => entry.id === data.id)) {
        entries.value = [data, ...entries.value];
      }
      return;
    }
    entries.value = [newLocalEntry(configuration), ...entries.value];
    writeLocalEntries(entries.value);
  }

  async function remove(id: string) {
    if (remote.value) {
      await apiClient.invoke(
        "shopbite.wishlist.delete delete /shopbite/wishlist/{id}",
        { pathParams: { id } },
      );
    }
    entries.value = entries.value.filter((entry) => entry.id !== id);
    if (!remote.value) writeLocalEntries(entries.value);
  }

  async function clear() {
    if (remote.value) {
      await Promise.all(
        entries.value.map((entry) =>
          apiClient.invoke(
            "shopbite.wishlist.delete delete /shopbite/wishlist/{id}",
            { pathParams: { id: entry.id } },
          ),
        ),
      );
    } else {
      clearLocalEntries();
    }
    entries.value = [];
  }

  return {
    entries,
    count,
    loaded,
    load,
    mergeGuestEntries,
    find,
    add,
    remove,
    clear,
  };
}
