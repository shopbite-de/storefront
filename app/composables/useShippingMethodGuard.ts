import type { Schemas } from "#shopware";

const SHIPPING_METHOD_BLOCKED_KEY = "shipping-method-blocked";

type CartError = {
  key?: string;
  messageKey?: string;
  message?: string;
  level?: number;
};

/**
 * Normalizes `cart.errors`, which the Store API delivers either as an
 * array or as an object keyed by error id.
 */
export function getCartErrors(cart?: Schemas["Cart"]): CartError[] {
  return Object.values(cart?.errors ?? {}) as CartError[];
}

export function hasBlockedShippingMethod(cart?: Schemas["Cart"]): boolean {
  return getCartErrors(cart).some(
    (error) => error.messageKey === SHIPPING_METHOD_BLOCKED_KEY,
  );
}

/**
 * Detects a blocked shipping method in the cart and switches to an
 * available one (sales-channel default first, otherwise the first
 * available), mirroring what Shopware's own storefront does.
 *
 * The Store API does not perform this switch itself. Without it, order
 * creation fails with `CHECKOUT__CART_INVALID` (`shipping-method-blocked`).
 */
export function useShippingMethodGuard() {
  const { cart, refreshCart } = useCart();
  const { getShippingMethods, setShippingMethod, selectedShippingMethod } =
    useCheckout();
  const { sessionContext } = useSessionContext();
  const toast = useToast();

  const isShippingMethodBlocked = computed(() =>
    hasBlockedShippingMethod(cart.value),
  );

  const isResolving = ref(false);

  /**
   * Refreshes the cart and, if the selected shipping method is blocked,
   * switches to an available one.
   *
   * @returns `true` when an unblocked shipping method is selected afterwards.
   */
  async function ensureAvailableShippingMethod(): Promise<boolean> {
    isResolving.value = true;
    try {
      await refreshCart();
      if (!isShippingMethodBlocked.value) return true;

      const blocked = selectedShippingMethod.value;
      const available = await getShippingMethods({ forceReload: true });
      const candidates = available.value.filter(
        (method) => method.id !== blocked?.id,
      );
      const defaultId = sessionContext.value?.salesChannel?.shippingMethodId;
      const target =
        candidates.find((method) => method.id === defaultId) ?? candidates[0];

      if (!target) return false;

      await setShippingMethod({ id: target.id });
      await refreshCart();
      if (isShippingMethodBlocked.value) return false;

      toast.add({
        title: "Versandart geändert",
        description: blocked?.name
          ? `${blocked.name} ist nicht mehr verfügbar. ${target.name} wurde ausgewählt.`
          : `${target.name} wurde ausgewählt.`,
        color: "warning",
        icon: "i-lucide-truck",
        progress: false,
      });
      return true;
    } finally {
      isResolving.value = false;
    }
  }

  return {
    isShippingMethodBlocked,
    isResolving,
    ensureAvailableShippingMethod,
  };
}
