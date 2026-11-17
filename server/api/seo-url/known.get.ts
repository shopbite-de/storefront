import type { components } from "~~/api-types/storeApiTypes";
type SeoUrl = components["schemas"]["SeoUrl"];

const CATEGORY_ROUTE = "frontend.navigation.page";
/** Shopware's default MAX_LIMIT of the Store API. */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/** One kind of category SEO URL, page by page; null if there are more. */
async function seoPathsOf(isCanonical: true | null): Promise<string[] | null> {
  const paths: string[] = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    const { elements = [] } = await storeApiPost<{ elements?: SeoUrl[] }>(
      "/seo-url",
      {
        limit: PAGE_SIZE,
        p,
        filter: [
          { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
          { type: "equals", field: "isCanonical", value: isCanonical },
        ],
        includes: { seo_url: ["seoPathInfo"] },
      },
    );
    paths.push(...elements.map((seoUrl) => seoUrl.seoPathInfo ?? ""));
    if (elements.length < PAGE_SIZE) return paths;
  }
  return null;
}

/**
 * All category SEO paths of the sales channel, current and old ones (the
 * Store API returns old SEO URLs only when the criteria filter on
 * `isCanonical`), as `seoPathKey`s. Null if there are more than
 * MAX_PAGES pages or Shopware fails: then nothing is filtered.
 */
const knownSeoPaths = defineCachedFunction(
  async (): Promise<string[] | null> => {
    const lists = await Promise.all([seoPathsOf(true), seoPathsOf(null)]).catch(
      (error) => {
        console.error("Failed to load the SEO paths", error);
        return null;
      },
    );
    if (!lists || lists.some((list) => list === null)) return null;

    return lists.flatMap((list) => (list ?? []).map(seoPathKey));
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.seoUrl,
    name: "seo-paths",
    getKey: () => "seo-paths",
    // a failed load is asked again on the next request
    validate: (entry) => Boolean(entry.value),
  },
);

/**
 * Whether a path may be a category SEO URL (useSeoUrlRoute asks before its
 * lookups on the server): `false` only if no category ever had it.
 */
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  const known = await knownSeoPaths();
  return { known: mayBeSeoPath(path, known ? new Set(known) : null) };
});
