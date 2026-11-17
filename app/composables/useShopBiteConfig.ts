import type { Schemas } from "#shopware";

export const SHOPBITE_CONFIG_KEY = "shopbite-config";

type ApiClient = ReturnType<typeof useShopwareContext>["apiClient"];

/**
 * The plugin configuration: from the server's short-lived cache
 * (`/api/shopbite/config`, `cacheTtl.config`) for server-side rendering,
 * from Shopware in the browser. The plugin does not enforce the checkout
 * switch itself, so the browser's value must be fresh: app.vue reloads it
 * after hydration (useLiveShopData), the checkout every 10 s.
 */
export async function loadShopBiteConfig(
  apiClient: ApiClient,
  fromServerCache: boolean,
): Promise<Schemas["ShopBiteConfig"]> {
  if (fromServerCache) {
    return await $fetch<Schemas["ShopBiteConfig"]>("/api/shopbite/config");
  }
  const { data } = await apiClient.invoke(
    "shopbite.config.get get /shopbite/config",
  );
  return data;
}

export function useShopBiteConfig() {
  const { apiClient } = useShopwareContext();

  const { data, refresh } = useAsyncData(SHOPBITE_CONFIG_KEY, () =>
    loadShopBiteConfig(apiClient, import.meta.server),
  );

  return {
    deliveryTime: computed(() => data.value?.deliveryTime ?? 30),
    isCheckoutEnabled: computed(() => data.value?.isCheckoutEnabled ?? false),
    refresh,
  };
}
