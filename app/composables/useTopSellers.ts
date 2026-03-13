import type { Schemas } from "#shopware";

export type useTopSellersReturn = {
  loadTopSellers(): Promise<Schemas["Product"][]>;
};

export function useTopSellers(): useTopSellersReturn {
  const { apiClient } = useShopwareContext();
  async function loadTopSellers() {
    try {
      const result = await apiClient.invoke("readProduct post /product", {
        body: {
          filter: [{ type: "equals", field: "markAsTopseller", value: true }],
          includes: {
            product: [
              "productNumber",
              "name",
              "description",
              "calculatedPrice",
            ],
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
