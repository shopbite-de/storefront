/**
 * The visitor's side of a request, handed to every port that acts for one
 * visitor (cart, checkout, account, orders, wishlist). The browser only
 * holds the storefront's own HttpOnly session cookie; whatever the backend
 * needs to recognise the visitor (Shopware: the `sw-context-token`) lives
 * server-side in that session and is read and written only by the adapter
 * (ADR 0001, implemented in step 4).
 */
export interface BackendSession {
  /** The adapter's opaque state for this visitor, undefined for a new one. */
  read(): Promise<string | undefined>;
  /**
   * Replaces the state, e.g. when the backend issues a new token on login
   * or logout; undefined forgets it.
   */
  write(state: string | undefined): Promise<void>;
  /**
   * The visitor's `X-Forwarded-For` chain (the incoming one with the
   * address the request came from), for a backend's per-IP rate limits.
   */
  readonly forwardedFor?: string;
}
