/**
 * Query parameters of the cached listing and search routes
 * (`/api/listing/[categoryId]`, `/api/search`). They become part of the cache
 * key, so they are validated and normalised first: an invalid value is a 400
 * and never creates a cache entry.
 */

/** Shopware's standard sortings (`listingSortings` replaces the list). */
export const DEFAULT_SORTINGS = [
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "topseller",
  "score",
];
/** Pages of 100 dishes; no menu has more. */
export const MAX_PAGE = 20;
export const MAX_TEXT_QUERY = 100;
export const MAX_FILTER_IDS = 50;

const ID = /^[0-9a-f]{32}$/i;

export interface ListingParams {
  order?: string;
  properties?: string;
  manufacturer?: string;
  query?: string;
  p?: number;
}

function invalid(name: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid parameter: ${name}`,
  });
}

function optionalString(
  query: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = query[name];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") invalid(name);
  return value.trim() || undefined;
}

/** `|`-separated 32-hex ids, lower case, without duplicates, sorted. */
function idList(query: Record<string, unknown>, name: string) {
  const value = optionalString(query, name);
  if (value === undefined) return undefined;
  const ids = value.split("|");
  if (ids.length > MAX_FILTER_IDS || !ids.every((id) => ID.test(id))) {
    invalid(name);
  }
  return [...new Set(ids.map((id) => id.toLowerCase()))].sort().join("|");
}

function sortings(): string[] {
  const configured = (
    useRuntimeConfig() as { listingSortings?: string | string[] }
  ).listingSortings;
  const list = Array.isArray(configured)
    ? configured
    : (configured ?? "").split(",");
  const keys = list.map((key) => String(key).trim()).filter(Boolean);
  return keys.length > 0 ? keys : DEFAULT_SORTINGS;
}

function order(query: Record<string, unknown>) {
  const value = optionalString(query, "order");
  if (value !== undefined && !sortings().includes(value)) invalid("order");
  return value;
}

function page(query: Record<string, unknown>) {
  const value = optionalString(query, "p");
  if (value === undefined) return undefined;
  if (!/^\d{1,2}$/.test(value)) invalid("p");
  const p = Number(value);
  if (p < 1 || p > MAX_PAGE) invalid("p");
  return p;
}

/** A search text: whitespace collapsed, at most `MAX_TEXT_QUERY` characters. */
function text(query: Record<string, unknown>, name: string) {
  const value = optionalString(query, name)?.replace(/\s+/g, " ");
  if (value !== undefined && value.length > MAX_TEXT_QUERY) invalid(name);
  return value;
}

/** A category id (32 hex characters), lower case. */
export function categoryIdParam(value: string | undefined): string {
  if (!value || !ID.test(value)) invalid("categoryId");
  return value.toLowerCase();
}

/** Parameters of `/api/listing/[categoryId]`. */
export function listingParams(query: Record<string, unknown>): ListingParams {
  return {
    order: order(query),
    properties: idList(query, "properties"),
    manufacturer: idList(query, "manufacturer"),
    query: text(query, "query"),
    p: page(query),
  };
}

/** Parameters of `/api/search`. */
export function searchParams(query: Record<string, unknown>) {
  return {
    search: text(query, "query"),
    order: order(query),
    p: page(query),
  };
}
