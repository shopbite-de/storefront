import type { Schemas } from "#shopware";
import { resolveSeoPath } from "~/utils/seoPath";

/**
 * Resolves the current route against the backend SEO URLs. Throws a 404 if
 * nothing matches and redirects (301) to the SEO URL if the visited path is
 * only an alias of it: missing or extra trailing slash (#291), different
 * casing (#244) or an old SEO URL of the same entity.
 */
export async function useSeoUrlRoute() {
  const { resolvePath } = useNavigationSearch();
  const { apiClient } = useShopwareContext();
  const route = useRoute();
  const routePath = route.path;

  const { data, error } = await useAsyncData(
    `cmsResponse${routePath}`,
    async () => {
      // For client links if the history state contains seo url information we can omit the api call
      if (import.meta.client && history.state?.routeName) {
        return {
          seoUrl: {
            routeName: history.state.routeName,
            foreignKey: history.state.foreignKey,
          } as Schemas["SeoUrl"],
        };
      }

      const { match, redirectPath } = await resolveSeoPath(
        routePath,
        resolvePath,
        resolveOldPath,
      );

      if (!match?.foreignKey) {
        throw createError({
          statusCode: 404,
          statusMessage: `No data fetched from API for ${routePath}`,
        });
      }

      return { seoUrl: match, redirectPath };
    },
  );

  if (error.value) {
    throw error.value;
  }

  if (data.value?.redirectPath) {
    await navigateTo(
      { path: data.value.redirectPath, query: route.query },
      { redirectCode: 301, replace: true },
    );
  }

  /**
   * The current SEO URL of the entity an old SEO URL belonged to. Shopware
   * keeps old SEO URLs with `isCanonical: null`; the Store API only returns
   * them when the criteria filter on `isCanonical` themselves.
   */
  async function resolveOldPath(
    path: string,
  ): Promise<Schemas["SeoUrl"] | null> {
    const old = await findSeoUrl([
      { type: "equals", field: "seoPathInfo", value: path.substring(1) },
      { type: "equals", field: "isCanonical", value: null },
    ]);
    if (!old) return null;

    return findSeoUrl([
      { type: "equals", field: "foreignKey", value: old.foreignKey },
      { type: "equals", field: "routeName", value: old.routeName },
      { type: "equals", field: "languageId", value: old.languageId },
      { type: "equals", field: "isCanonical", value: true },
    ]);
  }

  async function findSeoUrl(
    filter: { type: "equals"; field: string; value: string | boolean | null }[],
  ): Promise<Schemas["SeoUrl"] | null> {
    const { data } = await apiClient.invoke("readSeoUrl post /seo-url", {
      body: { limit: 1, filter },
    });

    return data.elements?.[0] ?? null;
  }

  return {
    seoUrl: computed(() => data.value?.seoUrl),
  };
}
