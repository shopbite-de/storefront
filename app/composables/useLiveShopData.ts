import { HOLIDAYS_KEY } from "./useHolidays";
import { OPENING_HOURS_KEY } from "./useOpeningHours";
import { SHIPPING_METHODS_KEY } from "./useShippingMethods";
import { SHOP_CONFIG_KEY } from "./useShopConfig";

/**
 * The switch that accepts orders, opening hours, holidays and lead times
 * are rendered from the server's caches; after mounting the browser loads
 * their live values once (app.vue, `?fresh=1`), so the store status, the
 * wished time choice and every checkout button act on current data.
 * `refreshNuxtData` waits for the end of hydration: a `refresh()` during
 * hydration returns the server's payload without a request.
 */
export function useLiveShopData() {
  onMounted(() =>
    refreshNuxtData([
      SHOP_CONFIG_KEY,
      OPENING_HOURS_KEY,
      HOLIDAYS_KEY,
      SHIPPING_METHODS_KEY,
    ]),
  );
}
