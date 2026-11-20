/**
 * The part of the runtime config the adapters read: each adapter picks
 * what it needs, so the registry stays generic.
 */
export type BackendRuntimeConfig = Readonly<{
  shopBite: Readonly<{ backend: string; timeZone: string }>;
  public: Readonly<{
    storeUrl: string;
    /** Overrides the plugin's menu root (`NUXT_PUBLIC_SHOP_BITE_MENU_CATEGORY_ID`). */
    shopBite?: Readonly<{ menuCategoryId?: string }>;
  }>;
}>;
