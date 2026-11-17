import type { components } from "~~/api-types/storeApiTypes";

/**
 * Weekly opening hours for server-side rendering (footer, home page,
 * Restaurant schema); the browser loads them from Shopware after mounting
 * (useBusinessHours).
 */
export default defineCachedEventHandler(
  async (): Promise<components["schemas"]["BusinessHourStruct"]> =>
    await storeApiGet("/shopbite/business-hour"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.businessHours,
    name: "business-hours",
    getKey: () => "business-hours",
  },
);
