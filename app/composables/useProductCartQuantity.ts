import type { Schemas } from "#shopware";

/**
 * Quantity of a product in the cart, across plain line items and the
 * container items that carry extras (the product is the first child, #325).
 */
export function useProductCartQuantity(getProductId: () => string) {
  const { cartItems } = useCart();

  const holdsProduct = (item: Schemas["LineItem"]): boolean =>
    item.referencedId === getProductId() ||
    (item.children ?? []).some(
      (child) => child.referencedId === getProductId(),
    );

  const quantity = computed(() =>
    cartItems.value
      .filter(holdsProduct)
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0),
  );

  return { quantity };
}
