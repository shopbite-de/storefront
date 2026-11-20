import type { ShopConfig } from "../../shared/domain";

export const SHOP_CONFIG_KEY = "shop-config";

/** Without runtime config (tests); the server passes `shopBite.timeZone`. */
const FALLBACK_TIME_ZONE = "Europe/Berlin";

const PATH = "/api/shop/config";

/**
 * The restaurant's configuration (`/api/shop/config`): whether it accepts
 * orders and its time zone. The server renders from its short-lived cache
 * (`cacheTtl.config`); the browser loads the live value, after hydration
 * (useLiveShopData) and in the checkout every 10 s. The ShopBite plugin
 * refuses an order while ordering is paused; the checkout asks the live
 * value before an order as well (defence in depth, a clear message).
 * Until the configuration is loaded (or when it fails) the time zone is
 * the storefront's `shopBite.timeZone`, handed over in the payload.
 */
export function useShopConfig() {
  const { data, refresh } = useAsyncData(SHOP_CONFIG_KEY, () =>
    loadShopData<ShopConfig>(PATH, import.meta.client),
  );
  // private runtime config, read on the server and kept in the payload
  const configuredTimeZone = useState<string>(
    "shop-time-zone",
    () =>
      (import.meta.server
        ? (useRuntimeConfig().shopBite as { timeZone?: string } | undefined)
            ?.timeZone
        : undefined) || FALLBACK_TIME_ZONE,
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
    timeZone: computed(() => data.value?.timeZone ?? configuredTimeZone.value),
    checkAcceptsOrders,
    refresh,
  };
}
