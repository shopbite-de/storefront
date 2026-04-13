/**
 * Per-product wishlist helper.
 * Replaces useProductWishlist() from @shopware/composables.
 */
export function useCommerceProductWishlist(productId: string) {
  const { items, addToWishlist, removeFromWishlist } = useCommerceWishlist();

  const isInWishlist = computed(() => items.value.includes(productId));

  return {
    isInWishlist,
    addToWishlist: () => addToWishlist(productId),
    removeFromWishlist: () => removeFromWishlist(productId),
  };
}
