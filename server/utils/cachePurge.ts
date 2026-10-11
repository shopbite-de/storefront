import { timingSafeEqual } from "node:crypto";

/**
 * Cache purge for the backoffice (#484): the cached Store API handlers keep
 * products, listings and categories for a day (`cacheTtl`). Nitro stores a
 * handler response under `cache:nitro:handlers:<name>:<escaped key>.json`;
 * the escaped key keeps the hex ids, so an id finds its entries.
 */

/** Entries of one product: the product, its variants and its extras. */
const PER_PRODUCT = ["product", "variant", "cross-selling"];
/** Lists that may show any product or category. */
const LISTS = ["listing", "search"];
const ALL = [...PER_PRODUCT, "category", ...LISTS];
const HANDLERS = "cache:nitro:handlers:";
/** Route rules with `swr` (llms.txt lists the menu). */
const ROUTES = "cache:nitro:routes:";

export interface PurgeTarget {
  products?: string[];
  categories?: string[];
}

const handlerOf = (key: string) =>
  key.slice(HANDLERS.length).split(":")[0] ?? "";
const compact = (id: string) => id.toLowerCase().replace(/[^0-9a-f]/g, "");

/**
 * The cache keys to remove: without a target everything; with a target the
 * entries of the named products and categories plus every list. An extras
 * group change reaches many dishes, so cross-sellings always go completely.
 */
export function keysToPurge(
  keys: string[],
  target: PurgeTarget = {},
): string[] {
  const products = (target.products ?? []).map(compact).filter(Boolean);
  const categories = (target.categories ?? []).map(compact).filter(Boolean);
  const everything = !products.length && !categories.length;
  return keys.filter((key) => {
    if (key.startsWith(ROUTES)) return true;
    if (!key.startsWith(HANDLERS)) return false;
    const handler = handlerOf(key);
    if (!ALL.includes(handler)) return false;
    if (everything || LISTS.includes(handler) || handler === "cross-selling")
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
