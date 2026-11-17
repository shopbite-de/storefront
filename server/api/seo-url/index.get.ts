import { createHash } from "node:crypto";
import type { components } from "~~/api-types/storeApiTypes";
type SeoUrl = components["schemas"]["SeoUrl"];

/**
 * Looks a path up against the canonical SEO URLs (useNavigationSearch).
 * Only matches are kept: an unknown path (a scanner probing `/wp-admin/`)
 * would otherwise add a cache entry per request. Shopware compares the path
 * case-insensitively, so all casings of a path share one entry.
 */
const findSeoUrl = defineCachedFunction(
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
    name: "seo-url",
    getKey: (path: string) =>
      createHash("sha1").update(path.toLowerCase()).digest("hex"),
    validate: (entry) => Boolean(entry.value),
  },
);

/** `{ seoUrl: null }` for an unknown path: not an error (see content/page). */
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  // longer than Shopware stores a SEO path
  if (path.length > 750) return { seoUrl: null };

  return { seoUrl: await findSeoUrl(path) };
});
