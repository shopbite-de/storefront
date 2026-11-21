import type { ResolvedRoute } from "../../shared/domain";
import { answerDomain } from "../utils/domainHttp";
import { resolveRoute } from "../utils/pathRoutes";

/**
 * What a storefront path stands for (`?path=`): `{ route: ResolvedRoute }`
 * for a menu section or a redirect to its canonical path, `{ route: null }`
 * when no section has the path (not an error; the catch-all page answers
 * 404). Hostile and unknown paths are answered without a lookup, matches
 * are cached (server/utils/pathRoutes.ts).
 */
export default defineEventHandler(
  async (event): Promise<{ route: ResolvedRoute | null }> => {
    const { path } = getQuery(event);
    if (typeof path !== "string" || !path.startsWith("/")) {
      throw createError({ statusCode: 400, statusMessage: "Invalid path" });
    }
    return { route: await answerDomain(() => resolveRoute(path)) };
  },
);
