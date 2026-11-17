import type { Schemas } from "#shopware";

export type useTopSellersReturn = {
  loadTopSellers(): Promise<Schemas["Product"][]>;
};

export function useTopSellers(): useTopSellersReturn {
  async function loadTopSellers() {
    try {
      // Cached on the server like the listings (server/api/top-sellers).
      return await $fetch<Schemas["Product"][]>("/api/top-sellers");
    } catch (e) {
      console.error("[useTopSellers][loadTopSellers]", e);
      return [];
    }
  }

  return {
    loadTopSellers,
  };
}
