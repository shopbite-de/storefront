import type { ListingQuery } from "../../shared/domain";

/**
 * Query parameters of the cached menu routes (`/api/listing/[sectionId]`,
 * `/api/search`, `/api/menu/...`). They become part of the cache key, so
 * they are validated and normalised first: an invalid value is a 400 and
 * never creates a cache entry.
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
export const MAX_NUMBER_LENGTH = 64;

/**
 * Ids are the backend's opaque strings (Shopware: 32 hex characters,
 * memory adapter: the same); the BFF only bounds what may become a key.
 * Lower case, so a purge by id finds every entry.
 */
const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export interface ListingParams {
  order?: string;
  filters?: string;
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

/** `|`-separated ids, lower case, without duplicates, sorted. */
function idList(query: Record<string, unknown>, name: string, max: number) {
  const value = optionalString(query, name);
  if (value === undefined) return undefined;
  const ids = value.split("|");
  if (ids.length > max || !ids.every((id) => ID.test(id))) invalid(name);
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

/** A section, dish or variant id, lower case. */
export function idParam(value: string | undefined, name: string): string {
  if (!value || !ID.test(value)) invalid(name);
  return value.toLowerCase();
}

/** Parameters of `/api/listing/[sectionId]`. */
export function listingParams(query: Record<string, unknown>): ListingParams {
  return {
    order: order(query),
    filters: idList(query, "filters", MAX_FILTER_IDS),
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

/** `options` of `/api/menu/dishes/[dishId]/variant`: 1 to 20 option ids. */
export function optionIdsParam(query: Record<string, unknown>): string[] {
  const options = idList(query, "options", 20);
  if (!options) invalid("options");
  return options.split("|");
}

/** `number` of `/api/menu/dishes`: a menu number as the guest's link has it. */
export function numberParam(query: Record<string, unknown>): string {
  const value = optionalString(query, "number");
  if (!value || value.length > MAX_NUMBER_LENGTH) invalid("number");
  return value;
}

/** The port's query for validated listing parameters. */
export function toListingQuery(params: {
  order?: string;
  filters?: string;
  p?: number;
}): ListingQuery {
  return {
    ...(params.order && { sorting: params.order }),
    ...(params.filters && { filterOptionIds: params.filters.split("|") }),
    ...(params.p && { page: params.p }),
  };
}
