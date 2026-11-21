import type { Id } from "../kernel";
import type { ResolvedRoute } from "./types";

/** Paths are compared decoded; the router hands them over encoded. */
function decodePath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/**
 * The route of a path that leads to a section: the section itself when the
 * path spells its canonical path, otherwise a redirect to that path. Every
 * adapter answers with it, so the storefront's cache can tell the answer
 * for another spelling of the same lookup.
 */
export function routeTo(
  path: string,
  sectionId: Id,
  canonicalPath: string,
): ResolvedRoute {
  return decodePath(canonicalPath) === decodePath(path)
    ? { kind: "menu-section", sectionId, canonicalPath }
    : { kind: "redirect", to: canonicalPath, sectionId };
}

/** `/Pizza/` ↔ `/Pizza`: the other spelling of the trailing slash. */
export function toggleTrailingSlash(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) || "/" : `${path}/`;
}
