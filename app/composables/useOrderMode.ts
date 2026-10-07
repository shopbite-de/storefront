import type { Schemas } from "#shopware";

/**
 * Delivery or pickup on the menu page (#443): the shipping methods of the
 * sales channel as a choice before the customer starts ordering. Which
 * methods exist and which payment methods they allow is decided by the
 * Shopware rules; after a switch the guard moves a payment method the new
 * shipping method blocks.
 */
export function useOrderMode() {
  const {
    shippingMethods,
    getShippingMethods,
    selectedShippingMethod,
    setShippingMethod,
  } = useCheckout();
  const { refreshCart } = useCart();
  const { ensureAvailableCheckoutMethods } = useCheckoutMethodGuard();

  const switching = ref(false);

  const options = computed(() =>
    (shippingMethods.value ?? []).map((method: Schemas["ShippingMethod"]) => ({
      value: method.id,
      label: method.translated?.name ?? method.name,
    })),
  );

  // A segmented control fits two to four methods; with one there is
  // nothing to choose.
  const selectable = computed(
    () => options.value.length >= 2 && options.value.length <= 4,
  );

  const selectedId = computed({
    get: () => selectedShippingMethod.value?.id ?? "",
    set: (id: string) => {
      void select(id);
    },
  });

  async function select(id: string) {
    if (!id || id === selectedShippingMethod.value?.id || switching.value) {
      return;
    }
    switching.value = true;
    try {
      await setShippingMethod({ id });
      await ensureAvailableCheckoutMethods();
      await refreshCart();
    } finally {
      switching.value = false;
    }
  }

  async function load() {
    try {
      await getShippingMethods();
    } catch (error) {
      console.error("[menu][useOrderMode] shipping methods", error);
    }
  }

  return { options, selectable, selectedId, switching, load };
}
