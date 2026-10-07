/**
 * The menu sections of the home page (#388, #444): the children of the menu
 * root (`menuCategoryId`, else the navigation root) with their photo
 * (`category.media`). Shared by the tiles and the word list of the presets.
 */
export async function useHomeMenuCategories() {
  const { apiClient } = useShopwareContext();
  const config = useRuntimeConfig();
  const rootId = config.public.shopBite.menuCategoryId || "main-navigation";

  const { data: categories } = await useAsyncData(
    "home-menu-categories",
    async () => {
      const response = await apiClient.invoke(
        "readNavigation post /navigation/{activeId}/{rootId}",
        {
          body: {
            depth: 1,
            // Sent as a POST body so the projection is honoured (#312).
            includes: {
              category: [
                "id",
                "name",
                "translated",
                "seoUrl",
                "customFields",
                "media",
              ],
              media: ["url", "thumbnails", "metaData"],
              media_thumbnail: ["url", "width"],
            },
          },
          pathParams: { activeId: "main-navigation", rootId },
        },
      );
      return response.data;
    },
  );

  return { categories };
}
