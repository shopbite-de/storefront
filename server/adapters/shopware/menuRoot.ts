import { request } from "./request";
import type { StoreApi } from "./storeApi";

/** The sales channel's navigation root, the menu root without a setting. */
export const NAVIGATION_ROOT = "main-navigation";

/**
 * The menu root (#486): `public.shopBite.menuCategoryId` if set, else
 * `menuCategoryId` of the ShopBite plugin configuration (which falls back
 * to the sales channel's navigation category), else the navigation root.
 * Rejects when the plugin configuration cannot be read: never a guess.
 */
export function menuRootReader(
  storeApi: StoreApi,
  configured: string | undefined,
): () => Promise<string> {
  return async () => {
    if (configured) return configured;
    const config = await request("the ShopBite configuration", () =>
      storeApi.get<{ menuCategoryId?: string | null }>("/shopbite/config"),
    );
    return config.menuCategoryId || NAVIGATION_ROOT;
  };
}
