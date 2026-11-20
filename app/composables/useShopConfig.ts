import type { ShopConfig } from "../../shared/domain";

export const SHOP_CONFIG_KEY = "shop-config";

/** Until the configuration is loaded (also the server's default). */
export const DEFAULT_TIME_ZONE = "Europe/Berlin";

const PATH = "/api/shop/config";

/**
 * The restaurant's configuration (`/api/shop/config`): whether it accepts
 * orders and its time zone. The server renders from its short-lived cache
 * (`cacheTtl.config`); the browser loads the live value, after hydration
 * (useLiveShopData) and in the checkout every 10 s. The backend does not
 * refuse orders when the restaurant stops accepting them, so the
 * browser's value is the gate and must be live.
 */
export function useShopConfig() {
  const { data, refresh } = useAsyncData(SHOP_CONFIG_KEY, () =>
    loadShopData<ShopConfig>(PATH, import.meta.client),
  );

  /**
   * Asks the backend (never a cache) right before an order, so the
   * checkout does not act on a value from the server render. `null` when
   * it cannot be checked.
   */
  async function checkAcceptsOrders(
    retryDelays?: readonly number[],
  ): Promise<boolean | null> {
    try {
      data.value = await loadShopData<ShopConfig>(PATH, true, retryDelays);
    } catch (error) {
      console.error("[checkout][checkAcceptsOrders]", error);
      return null;
    }
    return data.value?.acceptsOrders ?? false;
  }

  return {
    config: data,
    /** The switch that accepts orders; `false` until loaded. */
    acceptsOrders: computed(() => data.value?.acceptsOrders ?? false),
    /** The restaurant's time zone, in which hours and wished times apply. */
    timeZone: computed(() => data.value?.timeZone ?? DEFAULT_TIME_ZONE),
    checkAcceptsOrders,
    refresh,
  };
}
