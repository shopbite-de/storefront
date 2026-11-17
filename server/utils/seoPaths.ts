/**
 * Known SEO paths of the menu sections (see
 * server/api/seo-url/known.get.ts): lets the server answer a path that no
 * category ever had (`/wp-admin/`, `/.git/HEAD`) with a 404 without asking
 * Shopware four times (canonical and old SEO URL, with and without the
 * trailing slash).
 */

/** Technical URLs are looked up by `pathInfo`, never filtered. */
const TECHNICAL = /^\/(navigation|detail|landingPage)\//;

/**
 * The form two paths are compared in, loose like Shopware's lookup (MySQL
 * compares case- and accent-insensitively): decoded, without accents, lower
 * case, without leading and trailing slashes (the lookup tries both).
 */
export function seoPathKey(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // keep the raw path
  }
  return decoded
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

/**
 * Whether a path may resolve to a SEO URL. `known` is null when the list is
 * not available or incomplete: then every path may, and the lookup decides.
 */
export function mayBeSeoPath(path: string, known: Set<string> | null): boolean {
  if (!known || TECHNICAL.test(path)) return true;
  return known.has(seoPathKey(path));
}
