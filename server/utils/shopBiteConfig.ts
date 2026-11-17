import type { components } from "../../api-types/storeApiTypes";

/**
 * The ShopBite plugin configuration (delivery time, checkout switch, menu
 * root) for server-side rendering, `/api/shopbite/config` and the menu root.
 * `swr: false`: an answer is never older than `cacheTtl.config`. A failed
 * request throws and is not cached.
 */
export const shopBiteConfig = defineCachedFunction(
  async (): Promise<components["schemas"]["ShopBiteConfig"]> =>
    await storeApiGet("/shopbite/config"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.config,
    swr: false,
    name: "shopbite-config",
    getKey: () => "shopbite-config",
  },
);
