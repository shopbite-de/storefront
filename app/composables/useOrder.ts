import type { Id, Order } from "../../shared/domain";

/**
 * An order of the session's guest or customer (`/api/orders/[orderId]`,
 * ADR 0001 step 5), loaded in the browser: the confirmation, the order
 * page and the payment retry. Another visitor's order is not found.
 */
export function useOrder(orderId: Id) {
  const order = ref<Order | null>(null);

  async function load(): Promise<Order> {
    order.value = await $fetch<Order>(
      `/api/orders/${encodeURIComponent(orderId)}`,
    );
    return order.value;
  }

  /**
   * Retries the payment, with another payment method if given; answers
   * where to pay when that happens on another site.
   */
  async function retryPayment(
    paymentMethodId: Id | null,
  ): Promise<string | null> {
    const answer = await queuedWrite(() =>
      withStaleRetry(() =>
        $fetch<{ redirectUrl: string | null }>(
          `/api/orders/${encodeURIComponent(orderId)}/payment`,
          { method: "POST", body: { paymentMethodId } },
        ),
      ),
    );
    return answer.redirectUrl;
  }

  return { order, load, retryPayment };
}
