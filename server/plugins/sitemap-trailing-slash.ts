import type { StorefrontSitemapUrl } from "../utils/sitemap";

const CONTEXT_KEY = "sitemapTrailingSlashPaths";

/**
 * The sitemap module normalises every URL to "no trailing slash", which turns
 * Shopware category URLs like `/c/Pizza/` into 404s. Sources mark such URLs
 * with `_trailingSlash`; the paths are collected per request and restored in
 * the rendered XML, so sitemap and canonical URLs match.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("sitemap:resolved", ({ urls, event }) => {
    event.context[CONTEXT_KEY] = new Set(
      urls
        .filter((url) => (url as StorefrontSitemapUrl)._trailingSlash)
        .map((url) => url._relativeLoc),
    );
  });

  nitroApp.hooks.hook("sitemap:output", (ctx) => {
    const paths = ctx.event.context[CONTEXT_KEY] as Set<string> | undefined;
    if (paths?.size) {
      ctx.sitemap = restoreTrailingSlashes(ctx.sitemap, paths);
    }
  });
});
