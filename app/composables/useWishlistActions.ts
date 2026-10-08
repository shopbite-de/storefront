import type { Schemas } from "#shopware";

export function useWishlistActions() {
  const { addProducts, refreshCart } = useCart();
  const { triggerProductAdded } = useProductEvents();
  const { clearWishlist } = useWishlist();
  const { trackAddToCart: trackAddToCartEvent } = useTrackEvent();

  const isAddingToCart = ref(false);
  const addingItemId = ref<string | null>(null);
  const isLoading = ref(false);

  const clearWishlistHandler = async () => {
    try {
      isLoading.value = true;
      clearWishlist();
    } finally {
      isLoading.value = false;
    }
  };

  const addSingleItemToCart = async (product: Schemas["Product"]) => {
    try {
      addingItemId.value = product.id;

      // Check if this is a base product with variants
      const isBaseProduct = product.childCount && product.childCount > 0;
      if (isBaseProduct) {
        return;
      }

      const cartItems = [
        {
          id: product.id,
          quantity: 1,
          type: "product" as const,
        },
      ];

      const newCart = await addProducts(cartItems);
      await refreshCart(newCart);

      triggerProductAdded();
      trackAddToCartEvent(product, 1);
    } catch (error) {
      console.error("[wishlist][addSingleItemToCart] Error details:", error);
    } finally {
      addingItemId.value = null;
    }
  };

  const addAllItemsToCart = async (products: Schemas["Product"][]) => {
    if (products.length === 0) {
      return;
    }

    try {
      isAddingToCart.value = true;

      // Filter out base products (parent products with childCount > 0)
      // Only add actual variants or simple products
      const addableProducts = products.filter((product) => {
        const isBaseProduct = product.childCount && product.childCount > 0;
        return !isBaseProduct;
      });

      if (addableProducts.length === 0) {
        return;
      }

      const cartItems = addableProducts.map((product) => ({
        id: product.id,
        quantity: 1,
        type: "product" as const,
      }));

      const newCart = await addProducts(cartItems);
      await refreshCart(newCart);

      triggerProductAdded();
    } catch (error) {
      console.error("[wishlist][addAllItemsToCart] Error:", error);
    } finally {
      isAddingToCart.value = false;
    }
  };

  return {
    isAddingToCart,
    addingItemId,
    isLoading,
    clearWishlistHandler,
    addSingleItemToCart,
    addAllItemsToCart,
  };
}
