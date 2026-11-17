import type { components } from "~~/api-types/storeApiTypes";

const TOP_SELLERS_LIMIT = 8;

const criteria = {
  filter: [{ type: "equals", field: "markAsTopseller", value: true }],
  limit: TOP_SELLERS_LIMIT,
  // What the compact card and the quick view need (#327).
  includes: {
    product: [
      "id",
      "productNumber",
      "name",
      "translated",
      "description",
      "calculatedPrice",
      "available",
      "cover",
      "sortedProperties",
      // Allergens checked (#485); includes filter `translated` as well,
      // so custom fields only come back when listed here.
      "customFields",
      // Card link to the quick view deep link (#289).
      "seoUrls",
    ],
    seo_url: ["seoPathInfo", "isCanonical"],
    product_media: ["media"],
    media: ["url", "thumbnails"],
    media_thumbnail: ["width", "url"],
    property_group: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "customFields"],
  },
  associations: {
    cover: { associations: { media: {} } },
    properties: { associations: { group: {} } },
  },
};

/** The dishes marked as top sellers, for the home page (useTopSellers). */
export default defineCachedEventHandler(
  async (): Promise<components["schemas"]["Product"][]> => {
    const result = await storeApiPost<{
      elements?: components["schemas"]["Product"][];
    }>("/product", criteria, {
      // Variants marked as top sellers inherit name, cover and properties.
      headers: { "sw-inheritance": "true", "sw-include-seo-urls": "true" },
    });
    return result.elements ?? [];
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.listing,
    name: "top-sellers",
    getKey: () => "top-sellers",
  },
);
