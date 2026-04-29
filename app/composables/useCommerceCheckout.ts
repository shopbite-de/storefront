import type {
  PaymentMethod,
  ShippingMethod,
  MethodsResponse,
} from "~/types/commerce/checkout";
import type { Order } from "~/types/commerce/order";

/**
 * Platform-agnostic checkout composable backed by /api/checkout/*.
 * Replaces useCheckout() from @shopware/composables.
 *
 * Payment/shipping state is shared via useState so selection persists
 * across the multi-step checkout (warenkorb → zahlung-versand → bestaetigen).
 */
export function useCommerceCheckout() {
  const paymentMethods = useState<PaymentMethod[]>(
    "commerce:payment-methods",
    () => [],
  );
  const shippingMethods = useState<ShippingMethod[]>(
    "commerce:shipping-methods",
    () => [],
  );
  const selectedPaymentMethod = useState<PaymentMethod | null>(
    "commerce:selected-payment",
    () => null,
  );
  const selectedShippingMethod = useState<ShippingMethod | null>(
    "commerce:selected-shipping",
    () => null,
  );

  async function getPaymentMethods(): Promise<void> {
    const res = await $fetch<MethodsResponse<PaymentMethod>>(
      "/api/checkout/payment-methods",
    );
    paymentMethods.value = res.methods;
    selectedPaymentMethod.value =
      res.methods.find((m) => m.id === res.selectedId) ?? null;
  }

  async function getShippingMethods(): Promise<void> {
    const res = await $fetch<MethodsResponse<ShippingMethod>>(
      "/api/checkout/shipping-methods",
    );
    shippingMethods.value = res.methods;
    selectedShippingMethod.value =
      res.methods.find((m) => m.id === res.selectedId) ?? null;
  }

  async function setPaymentMethod({ id }: { id: string }): Promise<void> {
    await $fetch("/api/checkout/payment-method", {
      method: "PUT",
      body: { id },
    });
    selectedPaymentMethod.value =
      paymentMethods.value.find((m) => m.id === id) ?? null;
  }

  async function setShippingMethod({ id }: { id: string }): Promise<void> {
    await $fetch("/api/checkout/shipping-method", {
      method: "PUT",
      body: { id },
    });
    selectedShippingMethod.value =
      shippingMethods.value.find((m) => m.id === id) ?? null;
  }

  async function createOrder(data: {
    customerComment?: string;
  }): Promise<Order> {
    return $fetch<Order>("/api/checkout/order", {
      method: "POST",
      body: data,
    });
  }

  return {
    paymentMethods,
    shippingMethods,
    selectedPaymentMethod,
    selectedShippingMethod,
    getPaymentMethods,
    getShippingMethods,
    setPaymentMethod,
    setShippingMethod,
    createOrder,
  };
}
