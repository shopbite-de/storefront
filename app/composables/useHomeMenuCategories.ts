import type { NavigationNode } from "../../shared/domain";

/**
 * The menu sections of the home page (#388, #444): the sections below the
 * menu root with their photo (NavigationNode.media). Shared by the tiles and
 * the word list of the presets.
 */
export async function useHomeMenuCategories() {
  // Cached on the server with the other navigations (server/api/navigation).
  const { data: categories } = await useAsyncData("home-menu-categories", () =>
    $fetch<NavigationNode[]>("/api/navigation/home"),
  );

  return { categories };
}
