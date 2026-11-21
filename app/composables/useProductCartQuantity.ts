/**
 * Quantity of a dish in the cart, across its plain lines and the lines
 * that carry extras or removals (#325).
 */
export function useProductCartQuantity(getDishId: () => string) {
  const { lines } = useCartData();

  const quantity = computed(() =>
    lines.value
      .filter((item) => cartLineHoldsDish(item, getDishId()))
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0),
  );

  return { quantity };
}
