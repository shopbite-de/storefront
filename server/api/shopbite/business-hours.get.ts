import type { components } from "~~/api-types/storeApiTypes";

/**
 * Weekly opening hours for server-side rendering (footer, home page,
 * Restaurant schema); the browser loads them from Shopware again after
 * hydration (useLiveShopData).
 */
export default defineCachedEventHandler(
  async (): Promise<components["schemas"]["BusinessHourStruct"]> =>
    await storeApiGet("/shopbite/business-hour"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.businessHours,
    // never older than the TTL (default swr would serve a stale answer once)
    swr: false,
    name: "business-hours",
    getKey: () => "business-hours",
  },
);
