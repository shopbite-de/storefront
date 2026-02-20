import type { NavigationMenuItem } from "@nuxt/ui";
import { encodeForQuery } from "@shopware/api-client/helpers";

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

  const mainMenu = computed<NavigationMenuItem[]>(() => {
    if (!mainNavigation.value) return [];

    return mainNavigation.value?.map((item) => ({
      label: item.translated.name,
      to: item.seoUrl,
      target: item.linkNewTab ? "_blank" : undefined,
      icon: item.customFields?.shopbite_category_icon,
    }));
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

    return footerNavigation.value?.map((item) => ({
      label: item.translated.name,
      to: item.seoUrl,
      target: item.linkNewTab ? "_blank" : undefined,
      icon: item.customFields?.shopbite_category_icon,
    }));
  });

  return {
    mainNavigation,
    mainMenu,
    footerNavigation,
    footerMenu,
  };
}
