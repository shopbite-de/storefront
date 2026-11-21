/**
 * Delivery or pickup on the menu page (#443): the shop's shipping methods
 * as a choice before the guest starts ordering. Which methods exist and
 * which payment methods they allow is the shop backend's rule; after a
 * switch the guard moves a payment method the new shipping method blocks.
 * All active methods are offered, also those whose rule needs an address
 * the guest has not entered yet.
 */
export function useOrderMode() {
  const { selection, refreshSelection, selectShippingMethod } =
    useCheckoutMethods();
  const { methods: shippingMethods, load: loadShippingMethods } =
    useShippingMethodChoice();
  const { refresh: refreshCart } = useCartData();
  const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

  const switching = ref(false);

  const options = computed(() =>
    shippingMethods.value.map((method) => ({
      value: method.id,
      label: method.name,
    })),
  );

  // A segmented control fits two to four methods; with one there is
  // nothing to choose.
  const selectable = computed(
    () => options.value.length >= 2 && options.value.length <= 4,
  );

  const selectedId = computed({
    get: () => selection.value?.shippingMethodId ?? "",
    set: (id: string) => {
      void select(id);
    },
  });

  async function select(id: string) {
    if (!id || id === selection.value?.shippingMethodId || switching.value) {
      return;
    }
    switching.value = true;
    try {
      await selectShippingMethod(id);
      await ensureAvailableCheckoutMethods();
      await refreshCart();
    } finally {
      switching.value = false;
    }
  }

  async function load() {
    try {
      await Promise.all([
        loadShippingMethods(),
        selection.value ? undefined : refreshSelection(),
      ]);
    } catch (error) {
      console.error("[menu][useOrderMode] shipping methods", error);
    }
  }

  return { options, selectable, selectedId, switching, load };
}
