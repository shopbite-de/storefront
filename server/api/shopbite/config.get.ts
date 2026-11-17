import type { components } from "~~/api-types/storeApiTypes";

/**
 * ShopBite plugin configuration (delivery time, checkout switch, menu root)
 * for server-side rendering. Short TTL because it carries
 * `isCheckoutEnabled`; the browser asks Shopware directly
 * (useShopBiteConfig), so the checkout never acts on this cache.
 */
export default defineCachedEventHandler(
  async (): Promise<components["schemas"]["ShopBiteConfig"]> =>
    await storeApiGet("/shopbite/config"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.config,
    name: "shopbite-config",
    getKey: () => "shopbite-config",
  },
);
