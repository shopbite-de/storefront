import type { Category } from "~/types/commerce/category";
import type { NavigationMenuItem } from "@nuxt/ui";

export function useNavigation(withChildren: boolean | undefined) {
  const config = useRuntimeConfig();
  const menuCategoryId = computed(
    () => config.public.shopBite.menuCategoryId ?? "main-navigation",
  );

  const fetchNavigation = (activeId: string, rootId: string) =>
    $fetch<Category[]>("/api/navigation", {
      query: { activeId, rootId },
    });

  const mapCategoryToMenuItem = (category: Category): NavigationMenuItem => ({
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

  const { data: mainNavigation } = useAsyncData("main-navigation", () =>
    fetchNavigation("main-navigation", "main-navigation"),
  );

  const mainMenu = computed<NavigationMenuItem[]>(() =>
    (mainNavigation.value ?? []).map(mapCategoryToMenuItem),
  );

  const { data: footerNavigation } = useAsyncData("footer-navigation", () =>
    fetchNavigation("footer-navigation", "footer-navigation"),
  );

  const footerMenu = computed<NavigationMenuItem[]>(() =>
    (footerNavigation.value ?? []).map(mapCategoryToMenuItem),
  );

  const { data: menuCardNavigation } = useAsyncData("menu-category", () =>
    fetchNavigation("main-navigation", menuCategoryId.value),
  );

  const menuCardMenu = computed<NavigationMenuItem[]>(() =>
    (menuCardNavigation.value ?? []).map(mapCategoryToMenuItem),
  );

  return {
    mainNavigation,
    mainMenu,
    footerNavigation,
    footerMenu,
    menuCardNavigation,
    menuCardMenu,
  };
}
