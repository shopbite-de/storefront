import { withLeadingSlash, withTrailingSlash, withoutTrailingSlash } from "ufo";

type SeoPathMatch = {
  seoPathInfo?: string;
};

/**
 * Looks a path up and, if nothing matches, retries once with the trailing
 * slash toggled. Backend SEO URLs are exact: `/c/Pizza/` exists, `/c/Pizza`
 * does not (#291). A hit on the toggled path comes with the SEO URL to
 * redirect to, so the visited URL always matches the canonical one.
 */
export async function resolveSeoPath<T extends SeoPathMatch>(
  path: string,
  resolve: (path: string) => Promise<T | null>,
): Promise<{ match: T | null; redirectPath?: string }> {
  const match = await resolve(path);
  if (match || path === "/") return { match };

  const toggledPath = path.endsWith("/")
    ? withoutTrailingSlash(path)
    : withTrailingSlash(path);
  const toggledMatch = await resolve(toggledPath);
  if (!toggledMatch?.seoPathInfo) return { match: null };

  return {
    match: toggledMatch,
    redirectPath: withLeadingSlash(toggledMatch.seoPathInfo),
  };
}
