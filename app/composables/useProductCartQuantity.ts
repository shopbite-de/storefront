/**
 * Quantity of a product in the cart, across plain line items and the
 * container items that carry extras (the product is the first child, #325).
 */
export function useProductCartQuantity(getProductId: () => string) {
  const { cartItems } = useCart();

  const quantity = computed(() =>
    cartItems.value
      .filter((item) => lineItemHoldsProduct(item, getProductId()))
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0),
  );

  return { quantity };
}
