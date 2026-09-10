import { parseURL, withTrailingSlash } from "ufo";
import type { SitemapUrl } from "#sitemap/types";
import type { components } from "~~/api-types/storeApiTypes";

type Category = components["schemas"]["Category"];

/**
 * `_trailingSlash` marks URLs whose path must keep its trailing slash. The
 * sitemap module strips trailing slashes from every URL, but Shopware
 * category SEO URLs (`/c/Pizza/`) 404 without it; the
 * `sitemap-trailing-slash` server plugin restores them.
 */
export type StorefrontSitemapUrl = SitemapUrl & { _trailingSlash?: boolean };

/** Maps navigation categories to sitemap entries (pages with an SEO URL only). */
export function categoriesToSitemapUrls(
  categories: Category[],
): StorefrontSitemapUrl[] {
  const urls = new Map<string, StorefrontSitemapUrl>();

  for (const category of categories) {
    const path = category.seoUrl;
    // Technical /navigation/<id> URLs have no storefront route.
    if (
      category.type !== "page" ||
      !path?.startsWith("/") ||
      path.startsWith("//") ||
      path.startsWith("/navigation/") ||
      urls.has(path)
    ) {
      continue;
    }

    const lastmod = category.updatedAt ?? category.createdAt;
    const image = category.media?.url;

    urls.set(path, {
      loc: path,
      ...(lastmod && { lastmod }),
      ...(image && { images: [{ loc: image }] }),
      ...(path.endsWith("/") && { _trailingSlash: true }),
    });
  }

  return [...urls.values()];
}

/** Re-appends the trailing slash to `<loc>` entries whose path is listed. */
export function restoreTrailingSlashes(
  xml: string,
  paths: ReadonlySet<string>,
): string {
  if (paths.size === 0) return xml;

  return xml.replace(/<loc>([^<]+)<\/loc>/g, (match, loc: string) =>
    paths.has(parseURL(loc).pathname)
      ? `<loc>${withTrailingSlash(loc)}</loc>`
      : match,
  );
}
