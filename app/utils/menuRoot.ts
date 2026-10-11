/**
 * The root category of the menu (#486): NUXT_PUBLIC_SHOP_BITE_MENU_CATEGORY_ID
 * if set (existing installations), else `menuCategoryId` of the plugin
 * configuration (`/store-api/shopbite/config`, shopware-plugin#35, which
 * falls back to the sales channel's navigation category), else the
 * navigation root.
 */
export const NAVIGATION_ROOT = "main-navigation";

export function pickMenuRoot(
  configured: string | undefined,
  fromPlugin: string | undefined | null,
): string {
  return configured || fromPlugin || NAVIGATION_ROOT;
}
