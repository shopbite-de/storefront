import type {
  DishConfiguration,
  DishDetail,
  WishlistEntry,
} from "../../shared/domain";
import {
  fromLegacyEntry,
  isLegacyWishlistEntry,
  isWishlistEntry,
  newWishlistEntry,
  sameConfiguration,
  type LegacyWishlistEntry,
  type WishlistSelection,
} from "../utils/wishlist";

/**
 * The wishlist of dish configurations (#467, ADR 0001 step 7). An entry
 * is a dish as it was configured in the dish sheet: the dish, the chosen
 * variant, the extras and the removed main ingredients; the same dish can
 * be kept twice with different configurations.
 *
 * Logged-in customers keep their entries in the backend (`/api/wishlist`,
 * the BFF), guests in local storage (they outlive the session); on login
 * the guest entries move into the account, a logout shows the guest's
 * again. A backend without a wishlist (501 `not_implemented`) keeps
 * customers in local storage too. The guest wishlist of 2.x (configured
 * products by name and number in `shopbite-wishlist`, the plain product
 * ids of `sw-wishlist-items`) is converted with the dishes' sheets once.
 */

const STORAGE_KEY = "shopbite-wishlist";
/** The plain product ids of the wishlist before #467. */
const LEGACY_STORAGE_KEY = "sw-wishlist-items";
const STORAGE_VERSION = 2;

type Stored = {
  version: typeof STORAGE_VERSION;
  entries: WishlistEntry[];
  /** 2.x entries whose dish could not be loaded yet (an outage). */
  pending?: LegacyWishlistEntry[];
};

function readStorage(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function writeStorage(stored: Stored) {
  try {
    if (!stored.entries.length && !stored.pending?.length) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // private mode or blocked storage: the list lives for this visit only
  }
}

/** What local storage holds: entries and 2.x entries still to convert. */
function readStored(): {
  entries: WishlistEntry[];
  legacy: LegacyWishlistEntry[];
} {
  const stored = readStorage(STORAGE_KEY);
  const entries: WishlistEntry[] = [];
  const legacy: LegacyWishlistEntry[] = [];
  if (Array.isArray(stored)) {
    // the guest wishlist of 2.x
    legacy.push(...stored.filter(isLegacyWishlistEntry));
  } else if (stored && typeof stored === "object") {
    const value = stored as Partial<Stored>;
    if (Array.isArray(value.entries)) {
      entries.push(...value.entries.filter(isWishlistEntry));
    }
    if (Array.isArray(value.pending)) {
      legacy.push(...value.pending.filter(isLegacyWishlistEntry));
    }
  }
  const plain = readStorage(LEGACY_STORAGE_KEY);
  if (Array.isArray(plain)) {
    for (const productId of plain) {
      if (typeof productId !== "string") continue;
      if (legacy.some((entry) => entry.productId === productId)) continue;
      legacy.push({
        id: crypto.randomUUID().replaceAll("-", ""),
        productId,
        productNumber: "",
        without: [],
        extras: [],
        createdAt: new Date().toISOString(),
      });
    }
  }
  return { entries, legacy };
}

const statusOf = (error: unknown) =>
  (error as { statusCode?: number; status?: number } | null)?.statusCode ??
  (error as { status?: number } | null)?.status;

/**
 * The guest's entries; 2.x entries are converted with their dish's sheet
 * (a dish off the menu, 404, is dropped: its row was not shown either; one
 * that could not be loaded stays for the next visit).
 */
async function readGuestEntries(): Promise<WishlistEntry[]> {
  const { entries, legacy } = readStored();
  if (!legacy.length) return entries;
  const pending: LegacyWishlistEntry[] = [];
  const converted = await Promise.all(
    legacy.map(async (entry) => {
      try {
        const detail = await $fetch<DishDetail>(
          `/api/menu/dishes/${encodeURIComponent(entry.productId)}`,
        );
        return fromLegacyEntry(entry, detail);
      } catch (error) {
        if (statusOf(error) !== 404) pending.push(entry);
        return null;
      }
    }),
  );
  const next = [...entries];
  for (const entry of converted) {
    if (
      entry &&
      !next.some((known) =>
        sameConfiguration(known.configuration, entry.configuration),
      )
    ) {
      next.push(entry);
    }
  }
  next.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  writeStorage({ version: STORAGE_VERSION, entries: next, pending });
  return next;
}

function writeGuestEntries(entries: WishlistEntry[]) {
  const { legacy } = readStored();
  writeStorage({ version: STORAGE_VERSION, entries, pending: legacy });
}

const write = <T>(task: () => Promise<T>) =>
  queuedWrite(() => withStaleRetry(task));

export function useWishlistEntries() {
  const { isLoggedIn } = useCustomer();

  const entries = useState<WishlistEntry[]>(
    "shopbite-wishlist-entries",
    () => [],
  );
  const loaded = useState("shopbite-wishlist-loaded", () => false);
  // the backend keeps no wishlist (501): customers keep theirs in the browser
  const routesMissing = useState(
    "shopbite-wishlist-routes-missing",
    () => false,
  );

  const remote = computed(() => isLoggedIn.value && !routesMissing.value);
  const count = computed(() => entries.value.length);

  const isMissing = (error: unknown) =>
    domainErrorCode(error) === "not_implemented";
  const codeOf = (error: unknown) => domainErrorCode(error) ?? "no answer";

  async function load() {
    if (!import.meta.client) return;
    if (remote.value) {
      try {
        const answer = await guardedAccountRead((signal) =>
          $fetch<WishlistEntry[]>("/api/wishlist", { signal }),
        );
        // the customer switched while it ran: the newer load answers
        if (!answer) return;
        entries.value = [...answer];
        loaded.value = true;
        return;
      } catch (error) {
        if (!isMissing(error)) {
          console.error("[wishlist][load]", codeOf(error));
          return;
        }
        routesMissing.value = true;
      }
    }
    entries.value = await readGuestEntries();
    loaded.value = true;
  }

  /** Moves the guest entries into the account, right after the login. */
  async function mergeGuestEntries() {
    if (!import.meta.client || !remote.value) return load();
    const local = await readGuestEntries();
    if (!local.length) return load();
    try {
      const answer = await write(() =>
        $fetch<WishlistEntry[]>("/api/wishlist/merge", {
          method: "POST",
          body: {
            configurations: local.map((entry) => entry.configuration),
          },
        }),
      );
      entries.value = [...answer];
      loaded.value = true;
      // the guest entries are the account's now; unconverted ones stay
      writeGuestEntries([]);
    } catch (error) {
      if (isMissing(error)) routesMissing.value = true;
      else console.error("[wishlist][mergeGuestEntries]", codeOf(error));
      await load();
    }
  }

  function find(configuration: DishConfiguration) {
    return entries.value.find((entry) =>
      sameConfiguration(entry.configuration, configuration),
    );
  }

  async function add(selection: WishlistSelection) {
    if (find(selection.configuration)) return;
    if (remote.value) {
      const entry = await write(() =>
        $fetch<WishlistEntry>("/api/wishlist/entries", {
          method: "POST",
          body: selection.configuration,
        }),
      );
      if (!entries.value.some((known) => known.id === entry.id)) {
        entries.value = [entry, ...entries.value];
      }
      return;
    }
    entries.value = [newWishlistEntry(selection), ...entries.value];
    writeGuestEntries(entries.value);
  }

  const removeRemote = (id: string) =>
    write(() =>
      $fetch(`/api/wishlist/entries/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    );

  async function remove(id: string) {
    if (remote.value) await removeRemote(id);
    entries.value = entries.value.filter((entry) => entry.id !== id);
    if (!remote.value) writeGuestEntries(entries.value);
  }

  async function clear() {
    if (remote.value) {
      await Promise.all(entries.value.map((entry) => removeRemote(entry.id)));
    } else {
      writeGuestEntries([]);
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
