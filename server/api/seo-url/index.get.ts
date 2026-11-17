import { isHostilePath } from "../../utils/seoPaths";

/**
 * The canonical SEO URL of a path (useNavigationSearch); matches are cached
 * (findSeoUrl). `{ seoUrl: null }` for an unknown path: not an error (see
 * content/page).
 */
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  // longer than Shopware stores a SEO path, or a probe no SEO URL can match
  if (path.length > 750 || isHostilePath(path)) return { seoUrl: null };

  return { seoUrl: await findSeoUrl(path) };
});
