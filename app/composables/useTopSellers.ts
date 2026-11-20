import type { Dish } from "../../shared/domain";

export type useTopSellersReturn = {
  loadTopSellers(): Promise<readonly Dish[]>;
};

export function useTopSellers(): useTopSellersReturn {
  async function loadTopSellers() {
    try {
      // Cached on the server like the listings (server/api/top-sellers).
      return await $fetch<readonly Dish[]>("/api/top-sellers");
    } catch (e) {
      console.error("[useTopSellers][loadTopSellers]", e);
      return [];
    }
  }

  return {
    loadTopSellers,
  };
}
