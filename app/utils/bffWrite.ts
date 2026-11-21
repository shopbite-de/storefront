/**
 * Writes to the storefront's BFF routes (ADR 0001): the answer's domain
 * error code, and a write sent again when it carried an outdated session
 * (409 `stale_session`, a parallel request replaced it; by then the
 * browser has the new cookie).
 */

/** Retries of a write that carried an outdated session, and the pause. */
export const STALE_RETRIES = 2;
export const STALE_RETRY_MS = 150;

/** The domain error code of a failed BFF request (`data.code`), if any. */
export function domainErrorCode(error: unknown): string | undefined {
  const value = error as {
    data?: { data?: { code?: unknown }; code?: unknown };
  } | null;
  const code = value?.data?.data?.code ?? value?.data?.code;
  return typeof code === "string" ? code : undefined;
}

/** The details of a failed BFF request's domain error (`data.details`). */
export function domainErrorDetails(error: unknown): Record<string, unknown> {
  const value = error as {
    data?: { data?: { details?: unknown }; details?: unknown };
  } | null;
  const details = value?.data?.data?.details ?? value?.data?.details;
  return details && typeof details === "object"
    ? (details as Record<string, unknown>)
    : {};
}

export const isStaleSession = (error: unknown): boolean =>
  domainErrorCode(error) === "stale_session";

/** Sends `request`, again (twice at most) after an outdated session. */
export async function withStaleRetry<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (!isStaleSession(error) || attempt >= STALE_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, STALE_RETRY_MS));
    }
  }
}

// Module-level, so the whole page shares it. On the server this state
// would span unrelated requests, so server-side writes bypass it.
let writes: Promise<unknown> = Promise.resolve();

/**
 * Runs a BFF write after every write sent before it has its answer (ADR
 * 0001, step 5): the first write of a new visitor gets the session cookie
 * with its answer, and a second write sent before that answer would start
 * a second session (the later cookie wins, the other write's state is
 * lost). Cart, vouchers, the checkout's methods, the guest, addresses, the
 * order and the payment all go through it. A failed write does not stop
 * the next one.
 */
export function queuedWrite<T>(task: () => Promise<T>): Promise<T> {
  if (import.meta.server) return task();
  const result = writes.then(task, task);
  writes = result.catch(() => {});
  return result;
}

const CART_WRITE_KEY = "shopbite-cart-write";

/**
 * Notes a cart write in the tab: a full navigation right after it loads
 * the next page while the write (`keepalive`) may still be landing.
 */
export function noteCartWrite(): void {
  try {
    sessionStorage.setItem(CART_WRITE_KEY, String(Date.now()));
  } catch {
    // no storage (private mode): the next page does not look again
  }
}

/** Whether this tab wrote to the cart within the last `ms`. */
export function cartWrittenWithin(ms: number): boolean {
  try {
    const at = Number(sessionStorage.getItem(CART_WRITE_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at <= ms;
  } catch {
    return false;
  }
}
