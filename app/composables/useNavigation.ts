import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

export function useNavigation(withChildren: boolean | undefined) {
  const { apiClient } = useShopwareContext();
  const config = useRuntimeConfig();
  const menuCategoryId = computed(
    () => config.public.shopBite.menuCategoryId ?? "main-navigation",
  );

  // Sent as a POST body: as `_criteria` query parameters the projection is
  // ignored and every category arrives with media, translations, cms page
  // and more (#312).
  const criteria = {
    includes: {
      category: [
        "id",
        "name",
        "translated",
        "seoUrl",
        "customFields",
        "children",
        "linkNewTab",
      ],
    },
  };

  const { data: mainNavigation } = useAsyncData("main-navigation", async () => {
    const response = await apiClient.invoke(
      "readNavigation post /navigation/{activeId}/{rootId}",
      {
        body: criteria,
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
    children:
      category.children?.length && withChildren
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
        "readNavigation post /navigation/{activeId}/{rootId}",
        {
          body: criteria,
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

  const { data: menuCardNavigation } = useAsyncData(
    "menu-category",
    async () => {
      const response = await apiClient.invoke(
        "readNavigation post /navigation/{activeId}/{rootId}",
        {
          body: criteria,
          pathParams: {
            activeId: "main-navigation",
            rootId: menuCategoryId.value,
          },
        },
      );

      return response.data;
    },
  );

  const menuCardMenu = computed<NavigationMenuItem[]>(() => {
    if (!menuCardNavigation.value) return [];

    return menuCardNavigation.value?.map(mapCategoryToMenuItem);
  });

  return {
    mainNavigation,
    mainMenu,
    footerNavigation,
    footerMenu,
    menuCardNavigation,
    menuCardMenu,
  };
}
