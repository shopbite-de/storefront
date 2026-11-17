import type { components } from "~~/api-types/storeApiTypes";
import { createResilientLoader } from "../../utils/backoff";

const load =
  createResilientLoader<components["schemas"]["BusinessHourStruct"]>();

/**
 * Weekly opening hours for server-side rendering (footer, home page,
 * Restaurant schema); the browser loads them from Shopware again after
 * hydration (useLiveShopData).
 */
export default defineCachedEventHandler(
  (): Promise<components["schemas"]["BusinessHourStruct"]> =>
    load("business-hours", () => storeApiGet("/shopbite/business-hour")),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.businessHours,
    // never older than the TTL (default swr would serve a stale answer once)
    swr: false,
    name: "business-hours",
    getKey: () => "business-hours",
  },
);
