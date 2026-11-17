import type { Schemas } from "#shopware";

export function useShopBiteConfig() {
  const { apiClient } = useShopwareContext();

  const { data, refresh } = useAsyncData("shopbite-config", async () => {
    // The server renders from a short-lived cache (server/api/shopbite,
    // `cacheTtl.config`); the browser always asks Shopware, so the checkout's
    // refresh (Checkout/Summary.vue) never acts on a cached checkout switch.
    if (import.meta.server) {
      return await $fetch<Schemas["ShopBiteConfig"]>("/api/shopbite/config");
    }
    const { data } = await apiClient.invoke(
      "shopbite.config.get get /shopbite/config",
    );
    return data;
  });

  return {
    deliveryTime: computed(() => data.value?.deliveryTime ?? 30),
    isCheckoutEnabled: computed(() => data.value?.isCheckoutEnabled ?? false),
    refresh,
  };
}
