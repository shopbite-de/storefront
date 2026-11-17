import type { components } from "../../api-types/storeApiTypes";
import { createResilientLoader } from "./backoff";
type ShopBiteConfig = components["schemas"]["ShopBiteConfig"];

/**
 * `swr: false`: an answer is never older than `cacheTtl.config`. A failed
 * request throws and is not cached.
 */
const cachedConfig = defineCachedFunction(
  async (): Promise<ShopBiteConfig> => await storeApiGet("/shopbite/config"),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.config,
    swr: false,
    name: "shopbite-config",
    getKey: () => "shopbite-config",
  },
);

const load = createResilientLoader<ShopBiteConfig>();

/**
 * The ShopBite plugin configuration (delivery time, checkout switch, menu
 * root) for server-side rendering, `/api/shopbite/config` and the menu root.
 * When Shopware fails, the last good configuration is kept (the menu stays
 * on its root) and Shopware is asked again only after a pause, so an outage
 * does not multiply the requests; without one it throws.
 */
export function shopBiteConfig(): Promise<ShopBiteConfig> {
  return load("shopbite-config", () => cachedConfig());
}
