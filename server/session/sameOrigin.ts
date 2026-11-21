const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const originOf = (value: string): string | undefined => {
  try {
    const origin = new URL(value).origin;
    return origin === "null" ? undefined : origin.toLowerCase();
  } catch {
    return undefined;
  }
};

/**
 * CSRF guard of the BFF's state-changing routes (ADR 0001, step 4). The
 * session cookie is SameSite=Lax, so a browser does not send it with a
 * cross-site POST or fetch; on top, a write must come from the
 * storefront's own pages:
 *
 * - `Origin` (sent by browsers with every non-GET fetch) must be one of
 *   the storefront's origins, scheme and host: the origin of
 *   `public.storeUrl` and the request's own (Host header, the server's
 *   scheme). Forwarded headers are not trusted;
 * - without `Origin`, `Sec-Fetch-Site` must be `same-origin` (or `none`,
 *   a request the user started);
 * - a request with neither header is no browser request and carries no
 *   cookie a page could have made it send: it passes.
 */
export function isCrossSiteWrite(request: {
  method: string;
  origins: readonly (string | undefined)[];
  origin?: string;
  secFetchSite?: string;
}): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;
  const { origin, secFetchSite } = request;
  if (origin !== undefined) {
    const own = request.origins.flatMap((entry) => {
      const value = entry ? originOf(entry) : undefined;
      return value ? [value] : [];
    });
    const from = originOf(origin);
    return !from || !own.includes(from);
  }
  if (secFetchSite !== undefined) {
    return secFetchSite !== "same-origin" && secFetchSite !== "none";
  }
  return false;
}
