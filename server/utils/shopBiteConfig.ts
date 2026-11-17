import type { components } from "../../api-types/storeApiTypes";
import { createBackoff } from "./backoff";
type ShopBiteConfig = components["schemas"]["ShopBiteConfig"];

/** After a failed request, Shopware is asked again only after this pause. */
const FAILURE_BACKOFF_MS = 30_000;

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

const backoff = createBackoff(FAILURE_BACKOFF_MS);
let lastGood: ShopBiteConfig | null = null;

/**
 * The ShopBite plugin configuration (delivery time, checkout switch, menu
 * root) for server-side rendering, `/api/shopbite/config` and the menu root.
 * When Shopware fails, the last good configuration is kept (the menu stays
 * on its root) and Shopware is asked again only after a pause, so an outage
 * does not multiply the requests; without one it throws.
 */
export async function shopBiteConfig(): Promise<ShopBiteConfig> {
  if (backoff.active()) {
    if (lastGood) return lastGood;
    throw new Error("ShopBite configuration unavailable");
  }
  try {
    lastGood = await cachedConfig();
    return lastGood;
  } catch (error) {
    backoff.trip();
    if (lastGood) return lastGood;
    throw error;
  }
}
