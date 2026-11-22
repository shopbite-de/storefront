/** Most entries of a forwarded chain; the nearest ones are kept. */
const MAX_FORWARDED = 20;

/**
 * The `X-Forwarded-For` a proxy sends on (ADR 0001, step 4): the chain the
 * request brought with the socket address appended, for a backend's
 * per-IP limits (login, password reset, contact form, cart). Shopware takes
 * the rightmost address it does not trust, so with `TRUSTED_PROXIES`
 * listing the storefront and the proxies in front of it (and nothing
 * else), an entry a visitor forged on the left is never taken. The proxy
 * in front of the storefront must overwrite a client-sent header. Without
 * a socket address nothing is sent.
 */
export function forwardedFor(
  incoming: string | undefined,
  remoteAddress: string | undefined,
): string | undefined {
  if (!remoteAddress) return undefined;
  const chain = (incoming ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...chain, remoteAddress].slice(-MAX_FORWARDED).join(", ");
}
