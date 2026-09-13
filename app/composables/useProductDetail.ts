import type { Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";

export function useProductDetail(getProductId: () => string) {
  const { trackProductView } = useTrackEvent();

  const { data: productDetails, pending: isDetailLoading } = useFetch<{
    product: Schemas["Product"];
    configurator?: Schemas["PropertyGroup"][];
  }>(() => `/api/product/${getProductId()}`, {
    key: () => `product-${getProductId() ?? "none"}`,
  });

  // The extras belong to the product family: the backend resolves the
  // cross-selling of a variant to the one of its parent. Keyed by the listing
  // product, the request runs alongside the detail request instead of after
  // it, and switching a variant does not reload the extras. Together with the
  // single loading state below this keeps the quick view from re-rendering
  // in stages (skeleton, options, extras).
  const { associationItems, isAssociationsLoading } =
    useProductCrossSelling(getProductId);

  const pending = computed(
    () => isDetailLoading.value || isAssociationsLoading.value,
  );

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
    associationItems,
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
