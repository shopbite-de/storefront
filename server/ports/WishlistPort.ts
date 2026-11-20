import type { DishConfiguration, Id, WishlistEntry } from "../../shared/domain";
import type { BackendSession } from "./session";

/**
 * Guest & Account: the logged-in customer's wishlist of configured dishes.
 * A guest's wishlist stays in the browser; on login the storefront merges
 * it into the account (`merge`). All methods throw `unauthenticated`
 * without a customer; an adapter whose backend has no wishlist throws
 * `not_implemented`, and the storefront keeps the entries in the browser.
 *
 * Shopware: the ShopBite plugin's `/shopbite/wishlist`. Sylius: a wishlist
 * plugin.
 */
export interface WishlistPort {
  listEntries(session: BackendSession): Promise<readonly WishlistEntry[]>;
  /** Adds a configuration; an equal one is not added twice. */
  addEntry(
    session: BackendSession,
    configuration: DishConfiguration,
  ): Promise<WishlistEntry>;
  removeEntry(session: BackendSession, entryId: Id): Promise<void>;
  /** Takes over the guest's entries after login; answers the full list. */
  merge(
    session: BackendSession,
    configurations: readonly DishConfiguration[],
  ): Promise<readonly WishlistEntry[]>;
}
