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
        "externalLink",
        "customFields",
      ],
    },
  });

  const {
    data: mainNavigation,
    refresh,
    pending,
  } = useAsyncData("main-navigation", async () => {
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
      target: item.externalLink ? "_blank" : undefined,
      icon: item.customFields?.shopbite_category_icon,
    }));
  });

  return {
    refresh,
    isLoading: pending,
    mainNavigation,
    mainMenu,
  };
}
