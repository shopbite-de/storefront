import type {
  CheckoutSelection,
  Id,
  PaymentMethod,
  ShippingMethod,
} from "../../shared/domain";

let pendingSelection: Promise<CheckoutSelection> | undefined;

/**
 * The shipping and payment method of the visitor's next order (ADR 0001,
 * step 5): `/api/checkout/selection` (`CheckoutSelection`, also before
 * anything is in the cart) and the payment methods the visitor can use
 * now (`/api/checkout/payment-methods`). Shared app-wide; loaded in the
 * browser by the components that show them (menu order mode, checkout).
 */
export function useCheckoutMethods() {
  const selection = useState<CheckoutSelection | null>(
    "checkout-selection",
    () => null,
  );
  const paymentMethods = useState<readonly PaymentMethod[]>(
    "checkout-payment-methods",
    () => [],
  );
  const { shippingMethods } = useShippingMethods();

  const selectedShippingMethod = computed<ShippingMethod | null>(
    () =>
      shippingMethods.value?.find(
        (method) => method.id === selection.value?.shippingMethodId,
      ) ?? null,
  );
  const selectedPaymentMethod = computed<PaymentMethod | null>(
    () =>
      paymentMethods.value.find(
        (method) => method.id === selection.value?.paymentMethodId,
      ) ?? null,
  );

  /** Loads the selection; components asking at once share one request. */
  function refreshSelection(): Promise<CheckoutSelection> {
    const load = async () => {
      const next = await $fetch<CheckoutSelection>("/api/checkout/selection");
      selection.value = next;
      return next;
    };
    // no shared request on the server: it would span unrelated requests
    if (import.meta.server) return load();
    pendingSelection ??= load().finally(() => {
      pendingSelection = undefined;
    });
    return pendingSelection;
  }

  async function loadPaymentMethods(): Promise<readonly PaymentMethod[]> {
    const next = await $fetch<readonly PaymentMethod[]>(
      "/api/checkout/payment-methods",
    );
    paymentMethods.value = next;
    return next;
  }

  async function select(
    body: { shippingMethodId: Id } | { paymentMethodId: Id },
  ): Promise<CheckoutSelection> {
    const next = await queuedWrite(() =>
      withStaleRetry(() =>
        $fetch<CheckoutSelection>("/api/checkout/selection", {
          method: "POST",
          body,
        }),
      ),
    );
    selection.value = next;
    return next;
  }

  return {
    selection: computed(() => selection.value),
    paymentMethods: computed(() => paymentMethods.value),
    selectedShippingMethod,
    selectedPaymentMethod,
    refreshSelection,
    loadPaymentMethods,
    selectShippingMethod: (id: Id) => select({ shippingMethodId: id }),
    selectPaymentMethod: (id: Id) => select({ paymentMethodId: id }),
  };
}
