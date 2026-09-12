import type { Schemas } from "#shopware";

export type useTopSellersReturn = {
  loadTopSellers(): Promise<Schemas["Product"][]>;
};

const TOP_SELLERS_LIMIT = 8;

export function useTopSellers(): useTopSellersReturn {
  const { apiClient } = useShopwareContext();
  async function loadTopSellers() {
    try {
      const result = await apiClient.invoke("readProduct post /product", {
        // Variants marked as top sellers inherit name, cover and properties.

        // @ts-expect-error sw-inheritance is missing from the generated header type
        headers: { "sw-inheritance": "true" },
        body: {
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
            ],
            product_media: ["media"],
            media: ["url", "thumbnails"],
            media_thumbnail: ["width", "url"],
            property_group: ["id", "name", "translated", "options"],
            property_group_option: ["id", "name", "translated"],
          },
          associations: {
            cover: { associations: { media: {} } },
            properties: { associations: { group: {} } },
          },
        },
      });
      return result.data.elements;
    } catch (e) {
      console.error("[useTopSellers][loadTopSellers]", e);
      return [];
    }
  }

  return {
    loadTopSellers,
  };
}
