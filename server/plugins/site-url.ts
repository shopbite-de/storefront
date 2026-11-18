/**
 * Uses `storeUrl` (NUXT_PUBLIC_STORE_URL) as the site URL of nuxt-site-config,
 * so canonical URLs, the sitemap and robots.txt share one base URL instead of
 * the request origin (which is internal behind a reverse proxy).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("site-config:init", ({ siteConfig }) => {
    const { storeUrl } = useRuntimeConfig().public;
    if (storeUrl) {
      siteConfig.push({ _context: "storeUrl", url: storeUrl });
    }
  });
});
