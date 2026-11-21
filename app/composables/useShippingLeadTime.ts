/**
 * Fulfillment (delivery or pickup) and lead time of the shipping method
 * selected in the checkout (shopbite#6), from the shop's shipping methods.
 * Switching the method updates both. Before they are loaded it is a
 * delivery without a lead time.
 */
export function useShippingLeadTime() {
  const { selection } = useCheckoutMethods();
  const { leadTimeFor } = useShippingMethods();

  const current = computed(() =>
    leadTimeFor(selection.value?.shippingMethodId),
  );

  return {
    fulfillment: computed(() => current.value.fulfillment),
    leadTime: computed(() => current.value.minutes),
  };
}
