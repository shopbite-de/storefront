/**
 * ShopBite plugin configuration (lead times, checkout switch, menu root)
 * for server-side rendering, cached `cacheTtl.config` (shopBiteConfig). The
 * browser loads it from Shopware again after hydration (useLiveShopData).
 */
export default defineEventHandler(() => shopBiteConfig());
