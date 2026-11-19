/**
 * Fulfillment (delivery or pickup) and lead time of the shipping method
 * selected in the checkout (shopbite#6), from `shippingMethods` of the
 * plugin configuration. Switching the method updates both. Before the
 * configuration is loaded it is a delivery without a lead time.
 */
export function useShippingLeadTime() {
  const { selectedShippingMethod } = useCheckout();
  const { leadTimeFor } = useShopBiteConfig();

  const current = computed(() => leadTimeFor(selectedShippingMethod.value));

  return {
    fulfillment: computed(() => current.value.fulfillment),
    leadTime: computed(() => current.value.minutes),
  };
}
