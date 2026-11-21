import { createHash } from "node:crypto";
import {
  isHostilePath,
  isSafeRedirectTarget,
  mayBeKnownPath,
  pathKey,
  routeTo,
  toggleTrailingSlash,
  type Id,
  type ResolvedRoute,
} from "../../shared/domain";
import { createBackoff, createResilientLoader } from "./backoff";

/**
 * Path resolution behind the BFF (ADR 0001, step 3): `/api/resolve-path`
 * answers what a storefront path stands for (`NavigationPort.resolvePath`)
 * and shields the backend from vulnerability scanners:
 *
 * 1. Hostile paths (`isHostilePath`) are answered null without any request.
 * 2. Paths no section ever had are answered null from the cached list of
 *    known paths (`known-paths`), without a lookup. A failed load lets
 *    every path through for the backoff; a list too long to filter by
 *    lets every path through for the TTL.
 * 3. Lookups are cached (`path-route`) by the path in lower case, so one
 *    entry serves every casing; the answer for the visited spelling is
 *    built from the stored section and canonical path (`routeTo`). Only
 *    paths that spell the canonical path up to case (or with the trailing
 *    slash toggled) and paths under the backend's unlisted prefixes
 *    (technical URLs, one per entity) are stored: misses, former paths and
 *    loose matches of a collation (accents, trailing spaces) never create
 *    an entry, so the cache does not grow per spelling.
 *
 * `swr: false`: a renamed section neither keeps its old route nor 404s at
 * its new path beyond the TTL (`cacheTtl.seoUrl`).
 */
const { cacheTtl } = useRuntimeConfig().public.shopBite;

type Known = { keys: Set<string>; unlistedPrefixes: readonly string[] };

const knownPaths = defineCachedFunction(
  async (): Promise<{
    known: { keys: string[]; unlistedPrefixes: string[] } | null;
    loadedAt: number;
  }> => {
    const known = await useBackend().navigation.listKnownPaths();
    return {
      known: known && {
        keys: [...known.current, ...known.former].map(pathKey),
        unlistedPrefixes: [...known.unlistedPrefixes],
      },
      loadedAt: Date.now(),
    };
  },
  {
    maxAge: cacheTtl.seoUrl,
    // a new section must not 404 beyond the TTL
    swr: false,
    name: "known-paths",
    getKey: () => "known-paths",
  },
);

/** After a failed load, let every path through for the backoff. */
const knownBackoff = createBackoff();
let memo: { loadedAt: number; known: Known | null } | null = null;

/** The known paths, null when they cannot filter (too many, or failed). */
async function currentKnownPaths(): Promise<Known | null> {
  if (knownBackoff.active()) return null;
  try {
    const { known, loadedAt } = await knownPaths();
    if (memo?.loadedAt !== loadedAt) {
      memo = {
        loadedAt,
        known: known && {
          keys: new Set(known.keys),
          unlistedPrefixes: known.unlistedPrefixes,
        },
      };
    }
    return memo.known;
  } catch (error) {
    knownBackoff.trip();
    console.error("Failed to load the known paths", error);
    return null;
  }
}

type Target = { sectionId: Id; canonicalPath: string };

const isUnlisted = (path: string, known: Known | null) =>
  Boolean(known?.unlistedPrefixes.some((prefix) => path.startsWith(prefix)));

/** Whether an answer may be stored: bounded by the sections, not spellings. */
function storable(path: string, canonicalPath: string, unlisted: boolean) {
  if (unlisted) return true;
  const canonical = canonicalPath.toLowerCase();
  return (
    path.toLowerCase() === canonical ||
    toggleTrailingSlash(path).toLowerCase() === canonical
  );
}

// backs off during an outage; nothing is remembered (the cache keeps the
// storable answers)
const lookupLoader = createResilientLoader<ResolvedRoute | null>(() => false);

const cachedTarget = defineCachedFunction(
  async (
    path: string,
    unlisted: boolean,
  ): Promise<{ target: Target | null; storable: boolean }> => {
    const route = await lookupLoader(path, () =>
      useBackend().navigation.resolvePath(path),
    );
    if (!route) return { target: null, storable: false };
    const canonicalPath =
      route.kind === "redirect" ? route.to : route.canonicalPath;
    // never a redirect to another host (`//host/`), whatever the backend says
    if (!isSafeRedirectTarget(canonicalPath)) {
      console.warn("Left out a route that is no storefront path", {
        path,
        canonicalPath,
      });
      return { target: null, storable: false };
    }
    return {
      target: { sectionId: route.sectionId, canonicalPath },
      storable: storable(path, canonicalPath, unlisted),
    };
  },
  {
    maxAge: cacheTtl.seoUrl,
    // a renamed section must not keep its old route beyond the TTL
    swr: false,
    name: "path-route",
    // unlisted prefixes are case-sensitive: `/Navigation/<id>` (a path)
    // stays apart from the technical `/navigation/<id>`
    getKey: (path: string, unlisted: boolean) =>
      createHash("sha1")
        .update(`${unlisted ? "u" : "p"}:${path.toLowerCase()}`)
        .digest("hex"),
    validate: (entry) =>
      Boolean((entry.value as { storable?: boolean } | undefined)?.storable),
  },
);

/**
 * What a storefront path stands for, for `/api/resolve-path`. Null: no
 * section has it; a 503 while the backend is paused after a failure.
 */
export async function resolveRoute(
  path: string,
): Promise<ResolvedRoute | null> {
  if (isHostilePath(path)) return null;
  const known = await currentKnownPaths();
  if (!mayBeKnownPath(path, known)) return null;
  const { target } = await cachedTarget(path, isUnlisted(path, known));
  return target ? routeTo(path, target.sectionId, target.canonicalPath) : null;
}
