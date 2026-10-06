import { withLeadingSlash, withTrailingSlash, withoutTrailingSlash } from "ufo";

type SeoPathMatch = {
  seoPathInfo?: string;
};

type SeoPathResolution<T> = { match: T | null; redirectPath?: string };

/**
 * Looks a path up against the backend SEO URLs and tells the caller where to
 * redirect if the visited path is only an alias of the SEO URL:
 *
 * - The lookup is exact on the trailing slash: `/c/Pizza/` exists, `/c/Pizza`
 *   does not (#291). A miss is retried once with the slash toggled.
 * - The lookup is case-insensitive, so `/c/pizza/` resolves too (#244).
 * - `resolve` only finds current (canonical) SEO URLs. Shopware keeps the
 *   old SEO URL of an entity when the URL template or its name changes;
 *   `resolveOld` maps such a path to the current SEO URL, so old links
 *   redirect instead of returning 404. It is asked last, with and without
 *   the trailing slash, only for paths `resolve` does not know.
 *
 * Whenever the match carries a SEO path that differs from the visited path,
 * `redirectPath` names it, so the visited URL always ends up canonical.
 */
export async function resolveSeoPath<T extends SeoPathMatch>(
  path: string,
  resolve: (path: string) => Promise<T | null>,
  resolveOld?: (path: string) => Promise<T | null>,
): Promise<SeoPathResolution<T>> {
  if (path === "/") return { match: await resolve(path) };

  const match = await resolve(path);
  if (match) return withRedirect(path, match);

  const toggledPath = path.endsWith("/")
    ? withoutTrailingSlash(path)
    : withTrailingSlash(path);
  const toggledMatch = await resolve(toggledPath);
  if (toggledMatch?.seoPathInfo) return withRedirect(path, toggledMatch);

  if (!resolveOld) return { match: null };

  const current = (await resolveOld(path)) ?? (await resolveOld(toggledPath));
  if (!current?.seoPathInfo) return { match: null };

  return withRedirect(path, current);
}

function withRedirect<T extends SeoPathMatch>(
  path: string,
  match: T,
): SeoPathResolution<T> {
  if (!match.seoPathInfo) return { match };

  const seoPath = withLeadingSlash(match.seoPathInfo);
  if (decodePath(seoPath) === decodePath(path)) return { match };

  return { match, redirectPath: seoPath };
}

/** Compares paths on their decoded form; the router encodes `route.path`. */
function decodePath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}
