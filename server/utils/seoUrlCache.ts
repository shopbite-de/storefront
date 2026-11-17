import { createHash } from "node:crypto";
import type { components } from "../../api-types/storeApiTypes";
import { isTechnicalPath, loadSeoPaths } from "./seoPaths";
type SeoUrl = components["schemas"]["SeoUrl"];

type Lookup = { field: "pathInfo" | "seoPathInfo"; value: string };

/**
 * What Shopware compares a path with: technical URLs by `pathInfo` (without
 * the trailing slash), SEO URLs by `seoPathInfo` (without the leading one).
 */
export function seoUrlLookup(path: string): Lookup {
  return isTechnicalPath(path)
    ? { field: "pathInfo", value: path.replace(/\/$/, "") }
    : { field: "seoPathInfo", value: path.substring(1) };
}

/**
 * One SEO URL lookup. `exact` when the match spells the looked-up value
 * (up to case): Shopware's collation also ignores accents and trailing
 * spaces, and caching those variants would add an entry per spelling.
 */
const cachedLookup = defineCachedFunction(
  async (
    field: Lookup["field"],
    value: string,
  ): Promise<{ match: SeoUrl | null; exact: boolean }> => {
    const result = await storeApiPost<{ elements?: SeoUrl[] }>("/seo-url", {
      limit: 1,
      filter: [{ type: "equals", field, value }],
    });
    const match = result.elements?.[0] ?? null;
    const spelled = match?.[field];
    return {
      match,
      exact:
        typeof spelled === "string" &&
        spelled.toLowerCase() === value.toLowerCase(),
    };
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.seoUrl,
    // a renamed section must not keep its old match beyond the TTL
    swr: false,
    name: "seo-url",
    // the field keeps `/Navigation/<id>` (a SEO path) apart from the
    // technical `/navigation/<id>`
    getKey: (field: Lookup["field"], value: string) =>
      createHash("sha1")
        .update(`${field}:${value.toLowerCase()}`)
        .digest("hex"),
    // only exact matches: misses and loose spellings (a scanner probing
    // `/wp-admin/` or `/Pizza/%20`) never create an entry
    validate: (entry) =>
      Boolean((entry.value as { exact?: boolean } | undefined)?.exact),
  },
);

/** The canonical SEO URL of a path (/api/seo-url for useNavigationSearch). */
export async function findSeoUrl(path: string): Promise<SeoUrl | null> {
  const { field, value } = seoUrlLookup(path);
  return (await cachedLookup(field, value)).match;
}

/**
 * All category SEO paths (server/utils/seoPaths.ts). `paths: null` (more
 * than fit the pages) is kept for the TTL like a list; a failure throws and
 * is not cached (/api/seo-url/known backs off instead). `loadedAt` lets the
 * route reuse its Set until the entry changes.
 */
export const knownSeoPaths = defineCachedFunction(
  async (): Promise<{ paths: string[] | null; loadedAt: number }> => ({
    paths: await loadSeoPaths(async (criteria) => {
      const result = await storeApiPost<{ elements?: SeoUrl[] }>(
        "/seo-url",
        criteria,
      );
      return result.elements ?? [];
    }),
    loadedAt: Date.now(),
  }),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.seoUrl,
    // a new section must not 404 beyond the TTL
    swr: false,
    name: "seo-paths",
    getKey: () => "seo-paths",
  },
);
