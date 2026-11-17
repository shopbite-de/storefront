import { useSessionContext } from "#imports";
import type { Schemas } from "#shopware";

export type UseNavigationSearchReturn = {
  /**
   * Get {@link SeoUrl} entity for given path
   * @example resolvePath("/my-category/my-product") or resolvePath("/") for home page
   */
  resolvePath(path: string): Promise<Schemas["SeoUrl"] | null>;
};

/**
 * Composable to get search for SeoUrl entity for given path.
 * @public
 * @category Navigation & Routing
 */
export function useNavigationSearch(): UseNavigationSearchReturn {
  const { sessionContext } = useSessionContext();

  async function resolvePath(path: string): Promise<Schemas["SeoUrl"] | null> {
    if (path === "/") {
      // please ignore optional chaining for salesChannel object as it's always present (type definition issue)
      const categoryId =
        sessionContext.value?.salesChannel?.navigationCategoryId;

      return {
        routeName: "frontend.navigation.page",
        foreignKey: categoryId,
      } as Schemas["SeoUrl"];
    }

    // Matches are cached on the server (server/api/seo-url), so a menu
    // section does not ask Shopware for its SEO URL on every request.
    const { seoUrl } = await $fetch<{ seoUrl: Schemas["SeoUrl"] | null }>(
      "/api/seo-url",
      { query: { path } },
    );

    return seoUrl;
  }

  return {
    resolvePath,
  };
}
