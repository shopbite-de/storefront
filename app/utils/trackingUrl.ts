/**
 * Query parameters that page tracking may send: Matomo and UTM campaign
 * parameters and the quick view configuration (`produkt`, `ohne`, `extras`,
 * #411). Everything else is dropped, because links from e-mails carry
 * one-time secrets in the query (password reset `hash`, registration
 * confirmation `em`/`hash`).
 */
const ALLOWED_PARAMS = new Set(["produkt", "ohne", "extras"]);
const ALLOWED_PREFIXES = ["utm_", "mtm_", "pk_", "matomo_"];

function isAllowed(name: string): boolean {
  return (
    ALLOWED_PARAMS.has(name) ||
    ALLOWED_PREFIXES.some(
      (prefix) => name.startsWith(prefix) && name.length > prefix.length,
    )
  );
}

/** The path for Matomo's `setCustomUrl`: no fragment, allowed parameters only. */
export function trackingUrl(fullPath: string): string {
  const withoutHash = fullPath.split("#")[0] ?? "";
  const queryStart = withoutHash.indexOf("?");
  if (queryStart === -1) return withoutHash;

  const path = withoutHash.slice(0, queryStart);
  const kept = withoutHash
    .slice(queryStart + 1)
    .split("&")
    .filter((pair) => {
      const name = pair.split("=")[0] ?? "";
      try {
        return isAllowed(decodeURIComponent(name));
      } catch {
        return false;
      }
    });
  return kept.length ? `${path}?${kept.join("&")}` : path;
}
