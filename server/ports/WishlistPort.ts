import type { DishConfiguration, Id, WishlistEntry } from "../../shared/domain";
import type { BackendSession } from "./session";

/**
 * Guest & Account: the logged-in customer's wishlist of dish
 * configurations (ADR 0001, step 7). A guest's wishlist stays in the
 * browser (it outlives the session); on login the storefront merges it into
 * the account (`merge`). Entries are newest first; the same dish can be
 * kept twice with different configurations, an equal configuration once.
 *
 * Every method throws `unauthenticated` without a logged-in customer (a
 * checkout guest included). An adapter whose backend keeps no wishlist
 * throws `not_implemented`; the storefront then keeps the customer's
 * entries in the browser too.
 *
 * Shopware: the ShopBite plugin's `/shopbite/wishlist` (configurations by
 * product id, removed ingredients by name, extras by product number); a
 * customer's Shopware wishlist of plain dishes moves into it on the first
 * read. Sylius: a wishlist plugin.
 */
export interface WishlistPort {
  listEntries(session: BackendSession): Promise<readonly WishlistEntry[]>;
  /**
   * Adds a configuration and answers its entry; an equal one is answered
   * as it is. A dish or variant the menu does not offer is
   * `dish_unavailable`, a variant of another dish, an extra the dish does
   * not offer or a removal it does not have `invalid_value`.
   */
  addEntry(
    session: BackendSession,
    configuration: DishConfiguration,
  ): Promise<WishlistEntry>;
  /** Another customer's or an unknown entry is `not_found`. */
  removeEntry(session: BackendSession, entryId: Id): Promise<void>;
  /**
   * Takes over the guest's entries after login (at most `MERGE_LIMIT`, the
   * first one newest), leaving out equal ones and configurations the menu
   * no longer offers; answers the full list.
   */
  merge(
    session: BackendSession,
    configurations: readonly DishConfiguration[],
  ): Promise<readonly WishlistEntry[]>;
}

/** Most configurations one merge takes over (the ShopBite plugin's limit). */
export const WISHLIST_MERGE_LIMIT = 100;
