/**
 * Quantity of a dish in the cart, across plain line items and the
 * container items that carry extras (the dish is the first child, #325).
 */
export function useProductCartQuantity(getDishId: () => string) {
  const { cartItems } = useCart();

  const quantity = computed(() =>
    cartItems.value
      .filter((item) => cartLineHoldsDish(item, getDishId()))
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0),
  );

  return { quantity };
}
