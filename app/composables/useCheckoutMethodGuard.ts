import type { Schemas } from "#shopware";

type CheckoutMethod = { id: string; name?: string };

type MethodGuardConfig<M extends CheckoutMethod> = {
  isBlocked: () => boolean;
  selected: () => M | null;
  loadAvailable: () => Promise<M[]>;
  defaultId: () => string | undefined;
  select: (id: string) => Promise<void>;
};

/**
 * Detects a blocked payment method in the cart and switches to an
 * available one (sales-channel default first, otherwise the first
 * available), mirroring what Shopware's own storefront does.
 *
 * The Store API does not perform this switch itself. Without it, order
 * creation fails with `CHECKOUT__CART_INVALID` (`payment-method-blocked`).
 *
 * A blocked shipping method is only reported, never switched: its rule
 * usually needs the shipping address (delivery area), which a guest enters
 * after choosing delivery or pickup. Switching turned every delivery into
 * a pickup before the address was known (2.0.2). With an
 * address the checkout says the method is not possible and the customer
 * picks another one.
 */
export function useCheckoutMethodGuard() {
  // the cart's messages (ADR 0001, step 4); the methods are still the
  // Shopware layer's until step 5
  const { hasMessage, refresh: refreshCart } = useCartData();
  const { getPaymentMethods, setPaymentMethod, selectedPaymentMethod } =
    useCheckout();
  const { sessionContext } = useSessionContext();

  const isShippingMethodBlocked = computed(() =>
    hasMessage("shipping_method_blocked"),
  );
  const isPaymentMethodBlocked = computed(() =>
    hasMessage("payment_method_blocked"),
  );

  const isResolving = ref(false);

  const paymentConfig: MethodGuardConfig<Schemas["PaymentMethod"]> = {
    isBlocked: () => isPaymentMethodBlocked.value,
    selected: () => selectedPaymentMethod.value,
    loadAvailable: async () =>
      (await getPaymentMethods({ forceReload: true })).value,
    defaultId: () => sessionContext.value?.salesChannel?.paymentMethodId,
    select: (id) => setPaymentMethod({ id }),
  };

  /**
   * Expects a freshly loaded cart. Switches the method if it is blocked.
   *
   * @returns `true` when an unblocked method is selected afterwards.
   */
  async function resolve<M extends CheckoutMethod>(
    config: MethodGuardConfig<M>,
  ): Promise<boolean> {
    if (!config.isBlocked()) return true;

    const blocked = config.selected();
    const available = await config.loadAvailable();
    const candidates = available.filter((method) => method.id !== blocked?.id);
    const defaultId = config.defaultId();
    const target =
      candidates.find((method) => method.id === defaultId) ?? candidates[0];

    if (!target) return false;

    await config.select(target.id);
    await refreshCart();
    if (config.isBlocked()) return false;

    return true;
  }

  // Calls are serialized: the guard performs side effects (cart refresh,
  // method switch), so overlapping runs (e.g. the mount-time check
  // plus a quick click on the order button) must not race each other.
  // A call made while another one is in flight waits for it and then
  // re-checks the latest cart state.
  let queue: Promise<unknown> = Promise.resolve();

  function run(task: () => Promise<boolean>): Promise<boolean> {
    const execute = async () => {
      isResolving.value = true;
      try {
        await refreshCart();
        return await task();
      } finally {
        isResolving.value = false;
      }
    };
    const result = queue.then(execute, execute);
    queue = result.catch(() => {});
    return result;
  }

  /**
   * Refreshes the cart and tells whether the selected shipping method is
   * available. Never switches it (see above).
   */
  function ensureAvailableShippingMethod(): Promise<boolean> {
    return run(async () => !isShippingMethodBlocked.value);
  }

  /**
   * Refreshes the cart and, if the selected payment method is blocked,
   * switches to an available one.
   */
  function ensureAvailablePaymentMethod(): Promise<boolean> {
    return run(() => resolve(paymentConfig));
  }

  /**
   * Refreshes the cart and resolves a blocked payment method. A blocked
   * shipping method stays as it is; payment rules may depend on the
   * shipping method, so payment is then left untouched as well.
   *
   * @returns `true` when both methods are available afterwards.
   */
  function ensureAvailableCheckoutMethods(): Promise<boolean> {
    return run(async () => {
      if (isShippingMethodBlocked.value) return false;
      return resolve(paymentConfig);
    });
  }

  return {
    isShippingMethodBlocked,
    isPaymentMethodBlocked,
    isResolving,
    ensureAvailableShippingMethod,
    ensureAvailablePaymentMethod,
    ensureAvailableCheckoutMethods,
  };
}
