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
  retryDelays: readonly number[] = OPENING_HOURS_RETRY_DELAYS,
): Promise<Schemas["ShopBiteConfig"]> {
  if (fromServerCache) {
    return await $fetch<Schemas["ShopBiteConfig"]>("/api/shopbite/config");
  }
  // retried in the browser like the opening hours (#355)
  const { data } = await withRetries(
    () => apiClient.invoke("shopbite.config.get get /shopbite/config"),
    retryDelays,
  );
  return data;
}

export function useShopBiteConfig() {
  const { apiClient } = useShopwareContext();

  const { data, refresh } = useAsyncData(SHOPBITE_CONFIG_KEY, () =>
    loadShopBiteConfig(apiClient, import.meta.server),
  );

  /**
   * Asks Shopware (never the server cache) right before an order: the
   * plugin does not refuse orders itself, so the checkout must not act on
   * a value from the server render. `null` when it cannot be checked.
   */
  async function checkCheckoutEnabled(
    retryDelays?: readonly number[],
  ): Promise<boolean | null> {
    try {
      data.value = await loadShopBiteConfig(apiClient, false, retryDelays);
    } catch (error) {
      console.error("[checkout][checkCheckoutEnabled]", error);
      return null;
    }
    return data.value?.isCheckoutEnabled ?? false;
  }

  return {
    checkCheckoutEnabled,
    deliveryTime: computed(() => data.value?.deliveryTime ?? 30),
    isCheckoutEnabled: computed(() => data.value?.isCheckoutEnabled ?? false),
    refresh,
  };
}
