import { timingSafeEqual } from "node:crypto";

/**
 * Cache purge for the backoffice (#484): the cached Store API handlers keep
 * products, listings, categories and the layout data of every page for up
 * to a day (`cacheTtl`). Nitro stores a handler response under
 * `cache:nitro:handlers:<name>:<escaped key>.json` (cached functions under
 * `cache:nitro:functions:`); the escaped key keeps the hex ids, so an id
 * finds its entries.
 */

/** Entries of one product: the product, its variants and its extras. */
const PER_PRODUCT = ["product", "variant", "cross-selling"];
/** Lists that may show any product or category. */
const LISTS = ["listing", "search", "top-sellers"];
/**
 * Layout data of every page: navigations, SEO URL matches and breadcrumbs
 * (a renamed or moved section changes them), plugin config, hours, closing
 * days and payment methods. Small, so every purge takes all of it.
 */
export const LAYOUT = [
  "navigation",
  "breadcrumb",
  "shopbite-config",
  "business-hours",
  "holidays",
  "payment-methods",
];
/** Always purged: the lists and the layout data. */
const SHARED = [...LISTS, ...LAYOUT];
const ALL = [...PER_PRODUCT, "category", ...SHARED];
const HANDLERS = "cache:nitro:handlers:";
/** Cached functions: SEO URL matches, known SEO paths, the menu root. */
const FUNCTIONS = "cache:nitro:functions:";
const LAYOUT_FUNCTIONS = ["seo-url", "seo-paths", "menu-root"];
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
 * entries of the named products and categories plus every list and the
 * layout data. An extras group change reaches many dishes, so
 * cross-sellings always go completely. `layout` alone takes only the
 * layout data.
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
    if (everything || SHARED.includes(handler) || handler === "cross-selling")
      return true;
    if (handler === "category")
      return categories.some((id) => key.includes(id));
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
