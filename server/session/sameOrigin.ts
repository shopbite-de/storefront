const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard of the BFF's state-changing routes (ADR 0001, step 4). The
 * session cookie is SameSite=Lax, so a browser does not send it with a
 * cross-site POST or fetch; on top, a write must come from the
 * storefront's own pages:
 *
 * - `Origin` (sent by browsers with every non-GET fetch) must name one of
 *   the storefront's hosts (the request's host, the forwarded host, the
 *   host of `public.storeUrl`);
 * - without `Origin`, `Sec-Fetch-Site` must be `same-origin` (or `none`,
 *   a request the user started);
 * - a request with neither header is no browser request and carries no
 *   cookie a page could have made it send: it passes.
 */
export function isCrossSiteWrite(request: {
  method: string;
  hosts: readonly (string | undefined)[];
  origin?: string;
  secFetchSite?: string;
}): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false;
  const { origin, secFetchSite } = request;
  if (origin !== undefined) {
    const hosts = request.hosts.flatMap((host) =>
      host ? [host.toLowerCase()] : [],
    );
    if (hosts.length === 0) return true;
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return true;
    }
    return !hosts.includes(originHost.toLowerCase());
  }
  if (secFetchSite !== undefined) {
    return secFetchSite !== "same-origin" && secFetchSite !== "none";
  }
  return false;
}
