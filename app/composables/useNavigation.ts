import type { NavigationMenuItem } from "@nuxt/ui";
import { encodeForQuery } from "@shopware/api-client/helpers";
import type { Schemas } from "#shopware";

export function useNavigation() {
  const { apiClient } = useShopwareContext();

  const criteria = encodeForQuery({
    includes: {
      category: [
        "name",
        "translated",
        "seoUrl",
        "customFields",
        "children",
        "linkNewTab",
      ],
    },
  });

  const { data: mainNavigation } = useAsyncData("main-navigation", async () => {
    const response = await apiClient.invoke(
      "readNavigationGet get /navigation/{activeId}/{rootId}",
      {
        query: { _criteria: criteria },
        pathParams: {
          activeId: "main-navigation",
          rootId: "main-navigation",
        },
      },
    );

    return response.data;
  });

  const mapCategoryToMenuItem = (
    category: Schemas["Category"],
  ): NavigationMenuItem => ({
    label: category.translated?.name ?? category.name,
    to: category.translated?.seoUrl ?? category.seoUrl,
    target: category.linkNewTab ? "_blank" : undefined,
    icon: (category.customFields as Record<string, string> | null)
      ?.shopbite_category_icon,
    children: category.children?.length
      ? category.children.map(mapCategoryToMenuItem)
      : undefined,
  });

  const mainMenu = computed<NavigationMenuItem[]>(() => {
    if (!mainNavigation.value) return [];

    return mainNavigation.value?.map(mapCategoryToMenuItem);
  });

  const { data: footerNavigation } = useAsyncData(
    "footer-navigation",
    async () => {
      const response = await apiClient.invoke(
        "readNavigationGet get /navigation/{activeId}/{rootId}",
        {
          query: { _criteria: criteria },
          pathParams: {
            activeId: "footer-navigation",
            rootId: "footer-navigation",
          },
        },
      );

      return response.data;
    },
  );

  const footerMenu = computed<NavigationMenuItem[]>(() => {
    if (!footerNavigation.value) return [];

    return footerNavigation.value?.map(mapCategoryToMenuItem);
  });

  return {
    mainNavigation,
    mainMenu,
    footerNavigation,
    footerMenu,
  };
}
