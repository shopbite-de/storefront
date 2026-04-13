import type { Ref } from "vue";
import type { Order } from "~/types/commerce/order";

/**
 * Handles payment initiation and method changes for an existing order.
 * Replaces useOrderPayment() from @shopware/composables.
 *
 * Usage mirrors the original API:
 *   const order = ref<Order | null>(null)
 *   const { handlePayment, paymentUrl, changePaymentMethod } = useCommerceOrderPayment(computed(() => order.value))
 */
export function useCommerceOrderPayment(order: Ref<Order | null>) {
  const paymentUrl = ref<string | null>(null);

  async function handlePayment(
    successUrl: string,
    errorUrl: string,
  ): Promise<void> {
    if (!order.value) return;

    const result = await $fetch<{ redirectUrl: string | null }>(
      `/api/checkout/order/${order.value.id}/payment`,
      {
        method: "POST",
        body: { successUrl, errorUrl },
      },
    );

    paymentUrl.value = result.redirectUrl;
  }

  async function changePaymentMethod(paymentMethodId: string): Promise<void> {
    if (!order.value) return;

    await $fetch(`/api/checkout/order/${order.value.id}/payment-method`, {
      method: "PATCH",
      body: { paymentMethodId },
    });
  }

  return { paymentUrl, handlePayment, changePaymentMethod };
}
