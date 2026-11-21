import type { NavigationKind, NavigationNode } from "../../shared/domain";

/** A navigation entry of the header, footer and menu navigation. */
export interface NavigationMenuItem {
  label?: string;
  to?: string;
  target?: "_blank";
  icon?: string;
  children?: NavigationMenuItem[];
}

/** Loads a navigation from the server cache (server/api/navigation). */
const fetchNavigation = (kind: Exclude<NavigationKind, "home">) =>
  $fetch<NavigationNode[]>(`/api/navigation/${kind}`);

/**
 * The header (`main`), footer and menu navigation (ADR 0001, step 3): the
 * nodes as the BFF answers them, and as menu items for the link lists.
 */
export function useNavigation(withChildren: boolean | undefined) {
  // Every page renders these, a 404 too: the server keeps them
  // (server/api/navigation) instead of asking the backend per request.
  const { data: mainNavigation } = useAsyncData("main-navigation", () =>
    fetchNavigation("main"),
  );

  const toMenuItem = (node: NavigationNode): NavigationMenuItem => ({
    label: node.label,
    to: node.path ?? undefined,
    target: node.external ? "_blank" : undefined,
    icon: node.icon ?? undefined,
    children:
      node.children.length && withChildren
        ? node.children.map(toMenuItem)
        : undefined,
  });

  const mainMenu = computed<NavigationMenuItem[]>(() =>
    (mainNavigation.value ?? []).map(toMenuItem),
  );

  const { data: footerNavigation } = useAsyncData("footer-navigation", () =>
    fetchNavigation("footer"),
  );

  const footerMenu = computed<NavigationMenuItem[]>(() =>
    (footerNavigation.value ?? []).map(toMenuItem),
  );

  // The menu sections below the menu root (#486, resolved on the server).
  const { data: menuCardNavigation } = useAsyncData("menu-category", () =>
    fetchNavigation("menu"),
  );

  const menuCardMenu = computed<NavigationMenuItem[]>(() =>
    (menuCardNavigation.value ?? []).map(toMenuItem),
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
