import type { DishDetail } from "../../shared/domain";

/**
 * The dish sheet's data (`/api/menu/dishes/[dishId]`, DishDetail: variants,
 * extras, removable ingredients, food labels) and the configuration that
 * goes into the cart. The id of a variant opens its dish with that variant
 * selected. One request, so the sheet does not re-render in stages
 * (skeleton, options, extras).
 */
export function useProductDetail(getDishId: () => string) {
  const { trackProductView } = useTrackEvent();

  const { data: detail, pending } = useFetch<DishDetail>(
    () => `/api/menu/dishes/${getDishId()}`,
    { key: () => `dish-${getDishId() ?? "none"}` },
  );

  const {
    selectedDish,
    selectedQuantity,
    isLoading,
    addToCart,
    setSelectedDish,
    setSelectedExtras,
    setRemovedIngredients,
  } = useAddToCart();

  watch(
    detail,
    (value) => {
      if (!value) return;
      // the variant the sheet starts with, or the dish itself
      const orderable = orderableOf(value);
      setSelectedDish(orderable);
      trackProductView(orderable);
    },
    { immediate: true },
  );

  return {
    detail,
    pending,
    selectedDish,
    selectedQuantity,
    isLoading,
    addToCart,
    setSelectedDish,
    onExtrasSelected: setSelectedExtras,
    onIngredientsDeselected: setRemovedIngredients,
  };
}
