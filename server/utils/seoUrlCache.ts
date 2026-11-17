import { createHash } from "node:crypto";
import type { components } from "../../api-types/storeApiTypes";
import { loadSeoPaths } from "./seoPaths";
type SeoUrl = components["schemas"]["SeoUrl"];

/**
 * Looks a path up against the canonical SEO URLs (/api/seo-url for
 * useNavigationSearch). Only matches are kept: an unknown path (a scanner
 * probing `/wp-admin/`) would otherwise add a cache entry per request.
 * Shopware compares the path case-insensitively, so all casings of a path
 * share one entry.
 */
export const findSeoUrl = defineCachedFunction(
  async (path: string): Promise<SeoUrl | null> => {
    const isTechnicalUrl =
      path.startsWith("/navigation/") ||
      path.startsWith("/detail/") ||
      path.startsWith("/landingPage/");

    // without the leading slash for SEO URLs, without the trailing slash
    // for technical URLs
    const value = isTechnicalUrl ? path.replace(/\/$/, "") : path.substring(1);
    const field = isTechnicalUrl ? "pathInfo" : "seoPathInfo";

    const result = await storeApiPost<{ elements?: SeoUrl[] }>("/seo-url", {
      limit: 1,
      filter: [{ type: "equals", field, value }],
    });
    return result.elements?.[0] ?? null;
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.seoUrl,
    // a renamed section must not keep its old match beyond the TTL
    swr: false,
    name: "seo-url",
    getKey: (path: string) =>
      createHash("sha1").update(path.toLowerCase()).digest("hex"),
    validate: (entry) => Boolean(entry.value),
  },
);

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
