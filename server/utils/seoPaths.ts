/**
 * Known SEO paths of the menu sections (server/utils/seoUrlCache.ts,
 * server/api/seo-url/known.get.ts): lets the server answer a path that no
 * category ever had (`/wp-admin/`, `/.git/HEAD`) with a 404 without asking
 * Shopware four times (canonical and old SEO URL, with and without the
 * trailing slash). Wherever the comparison could differ from Shopware's
 * database lookup, the path is let through.
 */

/** Technical URLs (`/navigation/<id>`) are looked up by `pathInfo`. */
export function isTechnicalPath(path: string): boolean {
  return /^\/(navigation|detail|landingPage)\//.test(path);
}
const CATEGORY_ROUTE = "frontend.navigation.page";
/** Shopware's default MAX_LIMIT of the Store API. */
export const SEO_PATH_PAGE_SIZE = 100;
const MAX_PAGES = 10;

function decode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * The form two paths are compared in, close to MySQL's case- and
 * accent-insensitive collation: decoded, lower case, without accents, `ß`,
 * `æ`, `œ` written out, without leading and trailing slashes (the lookup
 * tries both).
 */
export function seoPathKey(path: string): string {
  return decode(path)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/^\/+|\/+$/g, "");
}

/**
 * Whether a path may resolve to a SEO URL. `known` is null when the list is
 * not available or too long: then every path may, and the lookup decides.
 * A key with characters outside printable ASCII (or an undecodable `%`) is
 * let through, since the collation may match it in ways not mapped here.
 */
export function mayBeSeoPath(path: string, known: Set<string> | null): boolean {
  if (!known || isTechnicalPath(path)) return true;
  const key = seoPathKey(path);
  if (/[^\x20-\x7e]/.test(key) || key.includes("%")) return true;
  return known.has(key);
}

/** Store API criteria for one page of category SEO URLs. */
export function seoPathCriteria(isCanonical: true | null, page: number) {
  return {
    limit: SEO_PATH_PAGE_SIZE,
    // `/seo-url` pages with `page`; `p` is ignored there
    page,
    // a stable order, so pages neither skip nor repeat rows
    sort: [{ field: "id", order: "ASC" }],
    filter: [
      { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
      // the Store API returns old SEO URLs only when the criteria filter on
      // `isCanonical`
      { type: "equals", field: "isCanonical", value: isCanonical },
    ],
    includes: { seo_url: ["seoPathInfo"] },
  };
}

type FetchPage = (
  criteria: ReturnType<typeof seoPathCriteria>,
) => Promise<{ seoPathInfo?: string }[]>;

async function pathsOf(
  isCanonical: true | null,
  fetchPage: FetchPage,
): Promise<string[] | null> {
  const paths: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const elements = await fetchPage(seoPathCriteria(isCanonical, page));
    paths.push(
      ...elements.map((seoUrl) => seoPathKey(seoUrl.seoPathInfo ?? "")),
    );
    if (elements.length < SEO_PATH_PAGE_SIZE) return paths;
  }
  return null;
}

/**
 * All current and old category SEO paths as `seoPathKey`s; null if there
 * are more than MAX_PAGES pages of one kind (then nothing is filtered).
 * Throws when Shopware fails.
 */
export async function loadSeoPaths(
  fetchPage: FetchPage,
): Promise<string[] | null> {
  const lists = await Promise.all([
    pathsOf(true, fetchPage),
    pathsOf(null, fetchPage),
  ]);
  if (lists.some((list) => list === null)) return null;
  return lists.flatMap((list) => list ?? []);
}
