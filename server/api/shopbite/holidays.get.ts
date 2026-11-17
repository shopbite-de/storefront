import type { components } from "~~/api-types/storeApiTypes";
import { createResilientLoader } from "../../utils/backoff";

const load = createResilientLoader<components["schemas"]["HolidayStruct"]>();

/**
 * Closing days for server-side rendering (home page, Restaurant schema); the
 * browser loads them from Shopware again after hydration (useLiveShopData).
 */
export default defineCachedEventHandler(
  (): Promise<components["schemas"]["HolidayStruct"]> =>
    load("holidays", () => storeApiGet("/shopbite/holiday")),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.holidays,
    // never older than the TTL (default swr would serve a stale answer once)
    swr: false,
    name: "holidays",
    getKey: () => "holidays",
  },
);
