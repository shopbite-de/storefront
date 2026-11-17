import type { components } from "~~/api-types/storeApiTypes";

/**
 * Closing days for server-side rendering (home page, Restaurant schema); the
 * browser loads them from Shopware after mounting (useHolidays).
 */
export default defineCachedEventHandler(
  async (): Promise<components["schemas"]["HolidayStruct"]> =>
    await storeApiGet("/shopbite/holiday"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.holidays,
    name: "holidays",
    getKey: () => "holidays",
  },
);
