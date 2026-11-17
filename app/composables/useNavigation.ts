import type { Schemas } from "#shopware";

/** A navigation entry of the header, footer and menu navigation. */
export interface NavigationMenuItem {
  label?: string;
  to?: string;
  target?: "_blank";
  icon?: string;
  children?: NavigationMenuItem[];
}

/** Loads a navigation from the server cache (server/api/navigation). */
const fetchNavigation = (type: "main" | "footer" | "menu") =>
  $fetch<Schemas["Category"][]>(`/api/navigation/${type}`);

export function useNavigation(withChildren: boolean | undefined) {
  // Every page renders these, a 404 too: the server keeps them
  // (server/api/navigation) instead of asking Shopware per request.
  const { data: mainNavigation } = useAsyncData("main-navigation", () =>
    fetchNavigation("main"),
  );

  const mapCategoryToMenuItem = (
    category: Schemas["Category"],
  ): NavigationMenuItem => ({
    label: category.translated?.name ?? category.name,
    to: category.translated?.seoUrl ?? category.seoUrl ?? undefined,
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

  const { data: footerNavigation } = useAsyncData("footer-navigation", () =>
    fetchNavigation("footer"),
  );

  const footerMenu = computed<NavigationMenuItem[]>(() => {
    if (!footerNavigation.value) return [];

    return footerNavigation.value?.map(mapCategoryToMenuItem);
  });

  // The menu sections below the menu root (#486, resolved on the server).
  const { data: menuCardNavigation } = useAsyncData("menu-category", () =>
    fetchNavigation("menu"),
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
