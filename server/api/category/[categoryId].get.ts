import type { components } from "~~/api-types/storeApiTypes";
type Schemas = components["schemas"];

// Everything the category header, useCategorySeo and the menu-section schema
// read; the projection only applies with a POST body (#312).
const criteria = {
  includes: {
    category: [
      "id",
      "name",
      "translated",
      "seoUrl",
      "externalLink",
      "customFields",
      "active",
      "type",
      "description",
      "metaTitle",
      "metaDescription",
      "media",
    ],
    ...MEDIA_INCLUDES,
  },
};

export default defineCachedEventHandler(
  async (event): Promise<Schemas["Category"]> => {
    const categoryId = getRouterParam(event, "categoryId")!;

    return await storeApiPost(`/category/${categoryId}`, criteria);
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "category",
    getKey: (event) => `category-${getRouterParam(event, "categoryId")}`,
  },
);
