import type { PlacedOrder, WishedTime } from "../../shared/domain";

const newAttemptId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/**
 * Places the visitor's cart as an order (`POST /api/checkout/orders`,
 * ADR 0001 step 5) with one attempt id per press of the order button. It
 * is sent again only after an outdated session (twice after 150 ms: that
 * request did not reach the backend). Any other failure ends the attempt:
 * the server waits for an unanswered order itself and answers
 * `order_status_unknown` when it cannot tell whether the order arrived, so
 * the browser never sends an order a second time on its own.
 */
export function usePlaceOrder() {
  async function placeOrder(input: {
    wishedTime: WishedTime | { date: string; time: string };
    note?: string | null;
  }): Promise<PlacedOrder> {
    const attemptId = newAttemptId();
    return queuedWrite(() =>
      withStaleRetry(() =>
        $fetch<PlacedOrder>("/api/checkout/orders", {
          method: "POST",
          body: {
            attemptId,
            wishedTime: input.wishedTime,
            note: input.note ?? null,
          },
        }),
      ),
    );
  }

  return { placeOrder };
}
