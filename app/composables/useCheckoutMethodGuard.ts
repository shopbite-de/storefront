import type { Schemas } from "#shopware";

const SHIPPING_METHOD_BLOCKED_KEY = "shipping-method-blocked";
const PAYMENT_METHOD_BLOCKED_KEY = "payment-method-blocked";

type CartError = {
  key?: string;
  messageKey?: string;
  message?: string;
  level?: number;
};

type CheckoutMethod = { id: string; name?: string };

/**
 * Normalizes `cart.errors`, which the Store API delivers either as an
 * array or as an object keyed by error id.
 */
export function getCartErrors(cart?: Schemas["Cart"]): CartError[] {
  return Object.values(cart?.errors ?? {}) as CartError[];
}

function hasCartError(cart: Schemas["Cart"] | undefined, key: string) {
  return getCartErrors(cart).some((error) => error.messageKey === key);
}

export function hasBlockedShippingMethod(cart?: Schemas["Cart"]): boolean {
  return hasCartError(cart, SHIPPING_METHOD_BLOCKED_KEY);
}

export function hasBlockedPaymentMethod(cart?: Schemas["Cart"]): boolean {
  return hasCartError(cart, PAYMENT_METHOD_BLOCKED_KEY);
}

type MethodGuardConfig<M extends CheckoutMethod> = {
  /** Human readable label, e.g. "Versandart" */
  label: string;
  icon: string;
  isBlocked: () => boolean;
  selected: () => M | null;
  loadAvailable: () => Promise<M[]>;
  defaultId: () => string | undefined;
  select: (id: string) => Promise<void>;
  displayName: (method: M) => string | undefined;
};

/**
 * Detects a blocked shipping or payment method in the cart and switches to
 * an available one (sales-channel default first, otherwise the first
 * available), mirroring what Shopware's own storefront does.
 *
 * The Store API does not perform this switch itself. Without it, order
 * creation fails with `CHECKOUT__CART_INVALID`
 * (`shipping-method-blocked` / `payment-method-blocked`).
 */
export function useCheckoutMethodGuard() {
  const { cart, refreshCart } = useCart();
  const {
    getShippingMethods,
    setShippingMethod,
    selectedShippingMethod,
    getPaymentMethods,
    setPaymentMethod,
    selectedPaymentMethod,
  } = useCheckout();
  const { sessionContext } = useSessionContext();
  const toast = useToast();

  const isShippingMethodBlocked = computed(() =>
    hasBlockedShippingMethod(cart.value),
  );
  const isPaymentMethodBlocked = computed(() =>
    hasBlockedPaymentMethod(cart.value),
  );

  const isResolving = ref(false);

  const shippingConfig: MethodGuardConfig<Schemas["ShippingMethod"]> = {
    label: "Versandart",
    icon: "i-lucide-truck",
    isBlocked: () => isShippingMethodBlocked.value,
    selected: () => selectedShippingMethod.value,
    loadAvailable: async () =>
      (await getShippingMethods({ forceReload: true })).value,
    defaultId: () => sessionContext.value?.salesChannel?.shippingMethodId,
    select: (id) => setShippingMethod({ id }),
    displayName: (method) => method.name,
  };

  const paymentConfig: MethodGuardConfig<Schemas["PaymentMethod"]> = {
    label: "Zahlart",
    icon: "i-lucide-badge-euro",
    isBlocked: () => isPaymentMethodBlocked.value,
    selected: () => selectedPaymentMethod.value,
    loadAvailable: async () =>
      (await getPaymentMethods({ forceReload: true })).value,
    defaultId: () => sessionContext.value?.salesChannel?.paymentMethodId,
    select: (id) => setPaymentMethod({ id }),
    displayName: (method) => method.distinguishableName ?? method.name,
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

    const blockedName = blocked ? config.displayName(blocked) : undefined;
    const targetName = config.displayName(target) ?? config.label;
    toast.add({
      title: `${config.label} geändert`,
      description: blockedName
        ? `${blockedName} ist nicht mehr verfügbar. ${targetName} wurde ausgewählt.`
        : `${targetName} wurde ausgewählt.`,
      color: "warning",
      icon: config.icon,
      progress: false,
    });
    return true;
  }

  // Calls are serialized: the guard performs side effects (cart refresh,
  // method switch, toast), so overlapping runs (e.g. the mount-time check
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
   * Refreshes the cart and, if the selected shipping method is blocked,
   * switches to an available one.
   */
  function ensureAvailableShippingMethod(): Promise<boolean> {
    return run(() => resolve(shippingConfig));
  }

  /**
   * Refreshes the cart and, if the selected payment method is blocked,
   * switches to an available one.
   */
  function ensureAvailablePaymentMethod(): Promise<boolean> {
    return run(() => resolve(paymentConfig));
  }

  /**
   * Refreshes the cart and resolves blocked shipping and payment methods.
   * Shipping is handled first because payment availability rules may
   * depend on the shipping method.
   *
   * @returns `true` when both methods are available afterwards.
   */
  function ensureAvailableCheckoutMethods(): Promise<boolean> {
    return run(async () => {
      const shippingOk = await resolve(shippingConfig);
      const paymentOk = await resolve(paymentConfig);
      return shippingOk && paymentOk;
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
