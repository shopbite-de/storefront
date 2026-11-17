import { BUSINESS_HOURS_KEY } from "./useBusinessHours";
import { HOLIDAYS_KEY } from "./useHolidays";
import { SHOPBITE_CONFIG_KEY } from "./useShopBiteConfig";

/**
 * The checkout switch, opening hours and closing days are rendered from the
 * server's caches; after mounting the browser loads them from Shopware once
 * (app.vue), so the store status, the delivery time choice and every
 * checkout button act on current data. `refreshNuxtData` waits for the end
 * of hydration: a `refresh()` during hydration returns the server's payload
 * without a request.
 */
export function useLiveShopData() {
  onMounted(() =>
    refreshNuxtData([SHOPBITE_CONFIG_KEY, BUSINESS_HOURS_KEY, HOLIDAYS_KEY]),
  );
}
