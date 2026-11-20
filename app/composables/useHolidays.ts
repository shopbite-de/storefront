import type { Holiday } from "../../shared/domain";

export const HOLIDAYS_KEY = "shop-holidays";

/**
 * The holidays (`/api/shop/holidays`, whole days in the restaurant's time
 * zone): from the server's cache (`cacheTtl.holidays`) for server-side
 * rendering, live in the browser, where app.vue reloads them after
 * hydration (useLiveShopData).
 */
export function useHolidays() {
  const { data, pending, status, refresh } = useAsyncData(
    HOLIDAYS_KEY,
    () =>
      loadShopData<readonly Holiday[]>(
        "/api/shop/holidays",
        import.meta.client,
      ),
    { immediate: false },
  );

  return { holidays: data, isLoading: pending, status, refresh };
}
