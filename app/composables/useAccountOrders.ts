import type { Order } from "../../shared/domain";

type OrderPage = {
  orders: readonly Order[];
  total: number;
  page: number;
  limit: number;
};

/**
 * The customer's orders, newest first (ADR 0001, step 6): `GET
 * /api/account/orders` (OrderPort). Each order opens on its page through
 * `useOrder`.
 */
export function useAccountOrders() {
  const page = useState<OrderPage | null>("account-orders", () => null);

  /** A page of orders; null when the customer switched meanwhile. */
  async function load(number = 1): Promise<OrderPage | null> {
    const answer = await guardedAccountRead((signal) =>
      $fetch<OrderPage>("/api/account/orders", {
        query: { page: number },
        signal,
      }),
    );
    if (answer) page.value = answer;
    return answer;
  }

  return {
    orders: computed(() => page.value?.orders ?? null),
    total: computed(() => page.value?.total ?? 0),
    load,
  };
}
