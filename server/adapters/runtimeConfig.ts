/**
 * The part of the runtime config the adapters read: each adapter picks
 * what it needs, so the registry stays generic.
 */
export type BackendRuntimeConfig = Readonly<{
  shopBite: Readonly<{ backend: string; timeZone: string }>;
  /**
   * The Shopware adapter's private connection (NUXT_SHOPWARE_ENDPOINT,
   * NUXT_SHOPWARE_ACCESS_TOKEN); never public.
   */
  shopware?: Readonly<{ endpoint?: string; accessToken?: string }>;
  public: Readonly<{
    storeUrl: string;
    /** Overrides the plugin's menu root (`NUXT_PUBLIC_SHOP_BITE_MENU_CATEGORY_ID`). */
    shopBite?: Readonly<{ menuCategoryId?: string }>;
    /** `site.countryId`: the Shopware id of the shop's country. */
    site?: Readonly<{ countryId?: string }>;
  }>;
}>;
