import type { Order } from "~/types/commerce/order";

/**
 * Replaces useCustomerOrders() for the order list page.
 */
export function useCommerceOrders() {
  const orders = ref<Order[]>([]);

  async function loadOrders(): Promise<void> {
    orders.value = await $fetch<Order[]>("/api/orders");
  }

  return { orders, loadOrders };
}

/**
 * Replaces useOrderDetails(id) for the order detail page.
 * Status is derived from the order's stateMachineState via the adapter.
 */
export function useCommerceOrderDetails(orderId: string) {
  const order = ref<Order | null>(null);
  const status = computed(() => order.value?.status ?? "");

  async function loadOrderDetails(): Promise<void> {
    order.value = await $fetch<Order>(`/api/orders/${orderId}`);
  }

  return { order, status, loadOrderDetails };
}
