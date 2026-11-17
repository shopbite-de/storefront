import type { Schemas } from "#shopware";

/**
 * The menu sections of the home page (#388, #444): the children of the menu
 * root (env, plugin configuration, navigation root; resolved on the server) with their photo
 * (`category.media`). Shared by the tiles and the word list of the presets.
 */
export async function useHomeMenuCategories() {
  // Cached on the server with the other navigations (server/api/navigation).
  const { data: categories } = await useAsyncData("home-menu-categories", () =>
    $fetch<Schemas["Category"][]>("/api/navigation/home"),
  );

  return { categories };
}
