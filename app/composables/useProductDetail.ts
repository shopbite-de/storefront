import type { Product, PropertyGroup } from "~/types/commerce/product";
import type { AssociationItemProduct } from "~/types/Association";

export function useProductDetail(getProductId: () => string) {
  const { trackProductView } = useTrackEvent();

  const { data: productDetails, pending } = useFetch<{
    product: Product;
    configurator?: PropertyGroup[];
  }>(() => `/api/product/${getProductId()}`, {
    key: () => `product-${getProductId() ?? "none"}`,
  });

  const {
    selectedProduct,
    selectedQuantity,
    isLoading,
    addToCart,
    setSelectedProduct,
    setSelectedExtras,
    setDeselectedIngredients,
  } = useAddToCart();

  watch(
    () => productDetails.value?.product,
    (product) => {
      if (product) {
        setSelectedProduct(product);
      }
    },
    { immediate: true },
  );

  watch(
    productDetails,
    () => {
      if (!productDetails.value) return;
      trackProductView(productDetails.value.product);
    },
    { immediate: true },
  );

  const onExtrasSelected = (extras: AssociationItemProduct[]) => {
    setSelectedExtras(extras);
  };

  const onIngredientsDeselected = (deselected: string[]) => {
    setDeselectedIngredients(deselected);
  };

  return {
    productDetails,
    pending,
    selectedProduct,
    selectedQuantity,
    isLoading,
    addToCart,
    setSelectedProduct,
    onExtrasSelected,
    onIngredientsDeselected,
  };
}
