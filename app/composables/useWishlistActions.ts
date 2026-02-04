import type { Schemas } from "#shopware";

export function useWishlistActions() {
  const { addProducts, refreshCart } = useCart();
  const toast = useToast();
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
      toast.add({
        title: "Merkliste geleert",
        description: "Alle Produkte wurden von der Merkliste entfernt.",
        icon: "i-lucide-trash",
        color: "neutral",
      });
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
        toast.add({
          title: "Variante erforderlich",
          description: `${product.translated.name} hat Varianten. Bitte wähle eine spezifische Variante aus.`,
          icon: "i-lucide-alert-circle",
          color: "warning",
        });
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

      toast.add({
        title: "In den Warenkorb gelegt",
        description: `${product.translated.name} wurde hinzugefügt.`,
        icon: "i-lucide-shopping-cart",
        color: "primary",
      });
    } catch (error) {
      console.error("[wishlist][addSingleItemToCart] Error details:", error);
      toast.add({
        title: "Fehler",
        description: "Produkt konnte nicht hinzugefügt werden.",
        icon: "i-lucide-alert-circle",
        color: "error",
      });
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
        toast.add({
          title: "Keine Produkte hinzugefügt",
          description: "Bitte wähle zuerst Varianten für deine Produkte aus.",
          icon: "i-lucide-alert-circle",
          color: "warning",
        });
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

      const skippedCount = products.length - addableProducts.length;
      const successMessage =
        skippedCount > 0
          ? `${addableProducts.length} Produkte hinzugefügt. ${skippedCount} Produkt(e) übersprungen (Varianten müssen einzeln ausgewählt werden).`
          : `${addableProducts.length} Produkte wurden in den Warenkorb gelegt.`;

      toast.add({
        title: "Produkte hinzugefügt",
        description: successMessage,
        icon: "i-lucide-shopping-cart",
        color: "primary",
      });
    } catch (error) {
      console.error("[wishlist][addAllItemsToCart] Error:", error);
      toast.add({
        title: "Fehler",
        description: "Produkte konnten nicht hinzugefügt werden.",
        icon: "i-lucide-alert-circle",
        color: "error",
      });
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
