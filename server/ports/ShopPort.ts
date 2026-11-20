import type {
  Branch,
  Holiday,
  OpeningHours,
  ShopConfig,
} from "../../shared/domain";

/**
 * Restaurant operations: what the restaurant configured in its backend.
 * Shop-wide, no visitor session. Whether the restaurant is open right now
 * (store status) and which wished times are possible are computed by the
 * storefront from these answers, not asked from the backend.
 *
 * Shopware: the ShopBite plugin's `/shopbite/config`, `/business-hour`,
 * `/holiday` and `/multi-channel-group`. Sylius: channel settings plus a
 * plugin for hours and holidays.
 */
export interface ShopPort {
  getConfig(): Promise<ShopConfig>;
  getOpeningHours(): Promise<OpeningHours>;
  /** Holidays as whole days; past ones may be left out. */
  getHolidays(): Promise<readonly Holiday[]>;
  /**
   * The branches of the restaurant's branch group, this storefront's own
   * marked `current`; branches without a URL are left out. Empty when the
   * restaurant has no branch group.
   */
  listBranches(): Promise<readonly Branch[]>;
}
