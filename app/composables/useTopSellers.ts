import type { Product } from "~/types/commerce/product";

export type useTopSellersReturn = {
  loadTopSellers(): Promise<Product[]>;
};

export function useTopSellers(): useTopSellersReturn {
  async function loadTopSellers(): Promise<Product[]> {
    try {
      return await $fetch<Product[]>("/api/products", {
        method: "POST",
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
    } catch (e) {
      console.error("[useTopSellers][loadTopSellers]", e);
      return [];
    }
  }

  return { loadTopSellers };
}
