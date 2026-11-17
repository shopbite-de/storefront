import { createBackoff } from "../../utils/backoff";
import { isHostilePath, mayBeSeoPath } from "../../utils/seoPaths";

/** After a failed load, let every path through for the backoff. */
const backoff = createBackoff();
let memo: { loadedAt: number; known: Set<string> } | null = null;

/**
 * Whether a path may be a category SEO URL (useSeoUrlRoute asks before its
 * lookups on the server): `false` for a hostile path (isHostilePath) and
 * for one no category ever had. When the list is too long or Shopware
 * fails, every other path may.
 */
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
  // before the branches that let every path through
  if (isHostilePath(path)) return { known: false };
  if (backoff.active()) return { known: true };

  try {
    const { paths, loadedAt } = await knownSeoPaths();
    if (!paths) return { known: true };
    if (memo?.loadedAt !== loadedAt) memo = { loadedAt, known: new Set(paths) };
    return { known: mayBeSeoPath(path, memo.known) };
  } catch (error) {
    backoff.trip();
    console.error("Failed to load the SEO paths", error);
    return { known: true };
  }
});
