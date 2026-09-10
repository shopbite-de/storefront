import type { Schemas } from "#shopware";
import { resolveSeoPath } from "~/utils/seoPath";

/**
 * Resolves the current route against the backend SEO URLs. Throws a 404 if
 * nothing matches and redirects (301) to the SEO URL if the visited path is
 * only an alias of it: missing or extra trailing slash (#291) or different
 * casing (#244).
 */
export async function useSeoUrlRoute() {
  const { resolvePath } = useNavigationSearch();
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

  return {
    seoUrl: computed(() => data.value?.seoUrl),
  };
}
