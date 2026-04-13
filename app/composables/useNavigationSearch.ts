import type { SeoUrl } from "~/types/commerce/category";

export type UseNavigationSearchReturn = {
  resolvePath(path: string): Promise<SeoUrl | null>;
};

export function useNavigationSearch(): UseNavigationSearchReturn {
  const { session } = useCommerceUser();

  async function resolvePath(path: string): Promise<SeoUrl | null> {
    if (path === "/") {
      const categoryId = session.value.navigationCategoryId;
      return {
        routeName: "frontend.navigation.page",
        foreignKey: categoryId,
      } as SeoUrl;
    }

    return await $fetch<SeoUrl | null>("/api/seo-url", {
      query: { path },
    });
  }

  return { resolvePath };
}
