import { randomUUID } from "node:crypto";
import {
  deepFreeze,
  DomainError,
  isDomainError,
  isSameDishConfiguration,
  type DishConfiguration,
  type Id,
  type WishlistEntry,
} from "../../../shared/domain";
import type { BackendSession, WishlistPort } from "../../ports";
import { WISHLIST_MERGE_LIMIT } from "../../ports/WishlistPort";
import type { MemoryCatalog } from "./catalog";

const unauthenticated = () =>
  new DomainError(
    "unauthenticated",
    "The wishlist needs a logged-in customer.",
  );
const invalid = (message: string, value: unknown) =>
  new DomainError("invalid_value", message, { value });

/**
 * WishlistPort in memory (ADR 0001, step 7): entries per customer account,
 * newest first, each a configuration the menu offers (the dish, a variant
 * of it, its extras and main ingredients). The customer of a session token
 * comes from the accounts (`customerOf`), so a logout or another
 * customer's token opens nothing.
 */
export function createMemoryWishlist(options: {
  catalog: MemoryCatalog;
  /** The logged-in customer's account id of a session token. */
  customerOf: (token: string) => Id | undefined;
  now?: () => number;
}): WishlistPort {
  const now = options.now ?? Date.now;
  const dishes = new Map(options.catalog.dishes.map((dish) => [dish.id, dish]));
  /** Entries per account, newest first. */
  const lists = new Map<Id, WishlistEntry[]>();
  /** Strictly increasing, so the newest entry is always first. */
  let last = 0;
  const stamp = () => (last = Math.max(now(), last + 1));

  async function accountOf(session: BackendSession): Promise<Id> {
    const token = await session.read();
    const id = token ? options.customerOf(token) : undefined;
    if (!id) throw unauthenticated();
    return id;
  }

  /** The configuration's menu number; refuses what the menu lacks. */
  function check(configuration: DishConfiguration): string {
    const dish = dishes.get(configuration.dishId);
    if (!dish) {
      throw new DomainError(
        "dish_unavailable",
        "The menu does not offer this dish.",
        { dishId: configuration.dishId },
      );
    }
    const variant = configuration.variantId
      ? dish.variants.find((entry) => entry.id === configuration.variantId)
      : undefined;
    if (configuration.variantId && !variant) {
      throw invalid("The dish has no such variant.", configuration.variantId);
    }
    const offered = dish.extraGroups.flatMap((group) => group.extras);
    for (const id of configuration.extraIds) {
      if (!offered.some((extra) => extra.id === id)) {
        throw invalid("The dish has no such extra.", id);
      }
    }
    const ingredients = variant?.ingredients ?? dish.ingredients;
    for (const id of configuration.removedIngredientIds) {
      if (!ingredients.some((ingredient) => ingredient.id === id)) {
        throw invalid("The dish has no such main ingredient.", id);
      }
    }
    return variant?.number ?? dish.number;
  }

  function entryOf(
    configuration: DishConfiguration,
    dishNumber: string,
    at: number,
  ): WishlistEntry {
    return deepFreeze({
      id: randomUUID().replaceAll("-", ""),
      configuration: structuredClone(configuration),
      dishNumber,
      addedAt: new Date(at).toISOString(),
    });
  }

  const listOf = (account: Id) => {
    let list = lists.get(account);
    if (!list) lists.set(account, (list = []));
    return list;
  };

  return {
    listEntries: async (session) =>
      deepFreeze([...listOf(await accountOf(session))]),

    addEntry: async (session, configuration) => {
      const list = listOf(await accountOf(session));
      const dishNumber = check(configuration);
      const equal = list.find((entry) =>
        isSameDishConfiguration(entry.configuration, configuration),
      );
      if (equal) return equal;
      const entry = entryOf(configuration, dishNumber, stamp());
      list.unshift(entry);
      return entry;
    },

    removeEntry: async (session, entryId) => {
      const list = listOf(await accountOf(session));
      const index = list.findIndex((entry) => entry.id === entryId);
      if (index < 0) {
        throw new DomainError("not_found", "There is no such wishlist entry.", {
          entryId,
        });
      }
      list.splice(index, 1);
    },

    merge: async (session, configurations) => {
      const list = listOf(await accountOf(session));
      const added: WishlistEntry[] = [];
      for (const configuration of configurations.slice(
        0,
        WISHLIST_MERGE_LIMIT,
      )) {
        let dishNumber: string;
        try {
          dishNumber = check(configuration);
        } catch (error) {
          // what the menu no longer offers is left out
          if (isDomainError(error)) continue;
          throw error;
        }
        if (
          [...added, ...list].some((entry) =>
            isSameDishConfiguration(entry.configuration, configuration),
          )
        ) {
          continue;
        }
        added.push(entryOf(configuration, dishNumber, 0));
      }
      // the guest's first entry is the newest, the account's follow
      const at = stamp() + added.length;
      last = at;
      list.unshift(
        ...added.map((entry, index) =>
          deepFreeze({
            ...entry,
            addedAt: new Date(at - index).toISOString(),
          }),
        ),
      );
      return deepFreeze([...list]);
    },
  };
}
