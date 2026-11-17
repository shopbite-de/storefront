import { createBackoff } from "../../utils/backoff";
import { mayBeSeoPath } from "../../utils/seoPaths";

/** After a failed load, let every path through for this long. */
const FAILURE_BACKOFF_MS = 30_000;
const backoff = createBackoff(FAILURE_BACKOFF_MS);
let memo: { loadedAt: number; known: Set<string> } | null = null;

/**
 * Whether a path may be a category SEO URL (useSeoUrlRoute asks before its
 * lookups on the server): `false` only if no category ever had it. When the
 * list is too long or Shopware fails, every path may.
 */
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }
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
