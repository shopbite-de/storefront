import { timingSafeEqual } from "node:crypto";

/**
 * Cache purge for the backoffice (#484): the cached handlers keep dishes,
 * listings, sections and the layout data of every page for up to a day
 * (`cacheTtl`). Nitro stores a handler response under
 * `cache:nitro:handlers:<name>:<escaped key>.json` (cached functions under
 * `cache:nitro:functions:`); the escaped key keeps the hex ids, so an id
 * finds its entries.
 */

/** Entries keyed by one dish: its variants by options. */
const PER_PRODUCT = ["variant"];
/**
 * Entries any product or section change can reach: the lists, the dish
 * sheets with their extras (an extra's price reaches every dish that
 * offers it), also by menu number, and the sections, whose sub-sections
 * group a parent's listing (a renamed sub-section changes its parent).
 */
const LISTS = [
  "menu-section",
  "listing",
  "search",
  "top-sellers",
  "upsell",
  "dish",
  "dish-number",
];
/**
 * Layout data of every page: navigations and breadcrumbs (a renamed or
 * moved section changes them) and payment methods; path routes and the
 * restaurant operations are cached functions (`LAYOUT_FUNCTIONS`). Small,
 * so every purge takes all of it.
 */
export const LAYOUT = ["navigation", "breadcrumb", "payment-methods"];
/** Always purged: the lists and the layout data. */
const SHARED = [...LISTS, ...LAYOUT];
const ALL = [...PER_PRODUCT, ...SHARED];
const HANDLERS = "cache:nitro:handlers:";
/**
 * Cached functions: the routes of paths and the known paths
 * (server/utils/pathRoutes.ts), the menu root (server/utils/navigationData.ts)
 * and the restaurant operations of the BFF (configuration, opening hours,
 * holidays, branches, shipping methods, the contact form's required
 * fields; `BACKEND_DATA_NAMES` in
 * server/utils/shopData.ts).
 */
const FUNCTIONS = "cache:nitro:functions:";
export const LAYOUT_FUNCTIONS = [
  "path-route",
  "known-paths",
  "menu-root",
  "shop-config",
  "shop-opening-hours",
  "shop-holidays",
  "shop-branches",
  "shipping-methods",
  "contact-form",
];
/** Route rules with `swr` (llms.txt lists the menu). */
const ROUTES = "cache:nitro:routes:";

export interface PurgeTarget {
  products?: string[];
  categories?: string[];
  /**
   * Only the layout data, e.g. after the opening hours, closing days or the
   * checkout switch changed. Combined with products or categories, their
   * entries go as well.
   */
  layout?: boolean;
}

const nameOf = (key: string, prefix: string) =>
  key.slice(prefix.length).split(":")[0] ?? "";
const compact = (id: string) => id.toLowerCase().replace(/[^0-9a-f]/g, "");

/**
 * The cache keys to remove: without a target everything; with a target the
 * entries of the named products and categories plus every list, the dish
 * sheets and the layout data. `layout` alone takes only the layout data.
 */
export function keysToPurge(
  keys: string[],
  target: PurgeTarget = {},
): string[] {
  const products = (target.products ?? []).map(compact).filter(Boolean);
  const categories = (target.categories ?? []).map(compact).filter(Boolean);
  const menu = products.length > 0 || categories.length > 0;
  const layoutOnly = Boolean(target.layout) && !menu;
  const everything = !menu && !layoutOnly;
  return keys.filter((key) => {
    if (key.startsWith(FUNCTIONS))
      return LAYOUT_FUNCTIONS.includes(nameOf(key, FUNCTIONS));
    if (key.startsWith(ROUTES)) return true;
    if (!key.startsWith(HANDLERS)) return false;
    const handler = nameOf(key, HANDLERS);
    if (!ALL.includes(handler)) return false;
    if (LAYOUT.includes(handler)) return true;
    if (layoutOnly) return false;
    if (everything || SHARED.includes(handler)) return true;
    return products.some((id) => key.includes(id));
  });
}

/** Constant-time check of the `Authorization: Bearer <secret>` header. */
export function hasPurgeSecret(
  header: string | undefined,
  secret: string,
): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
