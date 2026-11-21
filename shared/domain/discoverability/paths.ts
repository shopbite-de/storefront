/**
 * Rules for storefront paths that hold for every backend: which paths no
 * menu section can have, and the form in which the storefront compares a
 * path with the known ones (the scanner filter of the path resolution).
 */

/** `//host` and `/\host` are read as another host by browsers. */
const PROTOCOL_RELATIVE = /^\/[/\\]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/;

/**
 * Paths no section can have, answered with a 404 without any lookup:
 * undecodable or invalid UTF-8 (`/%ff`, `/%c0%ae`), double encoding
 * (`%25`), `..` (path traversal probes), control characters (`%00`,
 * `%0A`), a leading `//` or `/\` (protocol-relative, also encoded) and
 * paths longer than a backend stores (750 characters). Adapters add their
 * own (Shopware: technical prefixes without an entity id).
 */
export function isHostilePath(path: string): boolean {
  if (path.length > 750) return true;
  if (/%25/i.test(path) || path.includes("..")) return true;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return true;
  }
  return (
    decoded.includes("..") ||
    CONTROL_CHARACTERS.test(decoded) ||
    PROTOCOL_RELATIVE.test(path) ||
    PROTOCOL_RELATIVE.test(decoded)
  );
}

/**
 * Whether a backend's canonical path may be a redirect target: a
 * storefront path (one leading `/`), never another host (`//host/`,
 * `/\host`) or anything else `isHostilePath` rejects.
 */
export function isSafeRedirectTarget(target: string): boolean {
  return target.startsWith("/") && !isHostilePath(target);
}

function decode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * The form in which two paths are compared, close to MySQL's case- and
 * accent-insensitive collation (the loosest lookup of an adapter so far):
 * decoded, lower case, without accents, `ß`, `æ`, `œ` written out, without
 * leading and trailing slashes (the resolution tries both).
 */
export function pathKey(path: string): string {
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
 * Whether a path may resolve, given the keys (`pathKey`) of the known
 * paths and the prefixes that resolve unlisted. `known` is null when the
 * list is not available or too long: then every path may, and the lookup
 * decides. A key with characters outside printable ASCII (or an
 * undecodable `%`) is let through, since a collation may match it in ways
 * not mapped here.
 */
export function mayBeKnownPath(
  path: string,
  known: Readonly<{
    keys: ReadonlySet<string>;
    unlistedPrefixes: readonly string[];
  }> | null,
): boolean {
  if (isHostilePath(path)) return false;
  if (!known) return true;
  if (known.unlistedPrefixes.some((prefix) => path.startsWith(prefix)))
    return true;
  const key = pathKey(path);
  if (/[^\x20-\x7e]/.test(key) || key.includes("%")) return true;
  return known.keys.has(key);
}
