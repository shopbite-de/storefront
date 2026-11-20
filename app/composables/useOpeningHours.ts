import type { OpeningHours } from "../../shared/domain";

export const OPENING_HOURS_KEY = "shop-opening-hours";

/**
 * The weekly opening hours (`/api/shop/opening-hours`, domain
 * `OpeningHours`): from the server's cache (`cacheTtl.businessHours`) for
 * server-side rendering, live in the browser, where app.vue reloads them
 * after hydration (useLiveShopData). `immediate: false`: a component that
 * needs them in the SSR HTML calls `onServerPrefetch(() => refresh())`.
 */
export function useOpeningHours() {
  const { data, pending, status, refresh } = useAsyncData(
    OPENING_HOURS_KEY,
    () =>
      loadShopData<OpeningHours>("/api/shop/opening-hours", import.meta.client),
    { immediate: false },
  );

  return { openingHours: data, isLoading: pending, status, refresh };
}
