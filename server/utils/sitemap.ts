import { parseURL, withTrailingSlash } from "ufo";
import type { SitemapUrl } from "#sitemap/types";
import type { SitemapEntry } from "../../shared/domain";

/**
 * `_trailingSlash` marks URLs whose path must keep its trailing slash. The
 * sitemap module strips trailing slashes from every URL, but section paths
 * such as `/Speisekarte/Pizza/` 404 without it at a backend whose paths
 * end in a slash (Shopware); the `sitemap-trailing-slash` server plugin
 * restores them.
 */
export type StorefrontSitemapUrl = SitemapUrl & { _trailingSlash?: boolean };

/** The sitemap URLs of the sections' paths, with change date and photo. */
export function toSitemapUrls(
  entries: readonly SitemapEntry[],
): StorefrontSitemapUrl[] {
  return entries.map((entry) => ({
    loc: entry.path,
    ...(entry.lastModified && { lastmod: entry.lastModified }),
    ...(entry.image && { images: [{ loc: entry.image }] }),
    ...(entry.path.endsWith("/") && { _trailingSlash: true }),
  }));
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
