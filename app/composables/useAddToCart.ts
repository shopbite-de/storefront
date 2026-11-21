import type { Extra, Id } from "../../shared/domain";
import type { OrderableDish } from "../utils/dish";
import { computed, ref } from "vue";
import type { CartLineRequest } from "./useCartMutations";

/**
 * Adds a dish configuration to the cart (ADR 0001, step 4): the dish (or
 * the chosen variant of the dish `dishId`) with its extras and removed
 * ingredients, sent to `/api/cart/lines` by id. The adapter builds the
 * backend's line; the same configuration is merged into its line,
 * configurations that differ only in their removals stay two lines.
 */
export function useAddToCart() {
  const { addLine } = useCartMutations();
  // Feedback is the cart bar / header badge animation, not a toast (#325).
  const { triggerCartItemAdded } = useProductEvents();
  const { trackAddToCart: trackAddToCartEvent } = useTrackEvent();

  const selectedExtras = ref<Extra[]>([]);
  const removedIngredients = ref<string[]>([]);
  const selectedQuantity = ref(1);
  const selectedDish = ref<OrderableDish | null>(null);
  /** The dish the selected variant belongs to; the dish's own id otherwise. */
  const selectedDishId = ref<Id | null>(null);
  const isLoading = ref(false);

  /** The line as the receipt names it: `Name +Extra -Zutat`. */
  const cartItemLabel = computed(() => {
    if (!selectedDish.value) return "";
    return [
      selectedDish.value.name,
      ...selectedExtras.value.map((extra) => `+${extra.name}`),
      ...removedNames().map((name) => `-${name}`),
    ].join(" ");
  });

  /** The removed ingredients by name, trimmed, each once, in their order. */
  function removedNames(): string[] {
    return [
      ...new Set(
        removedIngredients.value
          .map((name) => name.trim())
          .filter((name) => name !== ""),
      ),
    ];
  }

  function lineRequest(dish: OrderableDish): CartLineRequest {
    const dishId = selectedDishId.value ?? dish.id;
    return {
      dishId,
      variantId: dish.id === dishId ? null : dish.id,
      extraIds: selectedExtras.value.map((extra) => extra.id),
      // the sheet and the wishlist name removals; the cart takes their ids
      removedIngredientIds: removedNames().flatMap((name) => {
        const ingredient = dish.ingredients.find(
          (candidate) => candidate.name === name,
        );
        return ingredient ? [ingredient.id] : [];
      }),
      quantity: selectedQuantity.value,
    };
  }

  async function addToCart(onSuccess?: () => void) {
    if (!selectedDish.value || isLoading.value) return;
    isLoading.value = true;

    try {
      // Failures are reported by useCartMutations; it resolves undefined.
      const newCart = await addLine(lineRequest(selectedDish.value));
      if (!newCart) return;

      triggerCartItemAdded(selectedDish.value, selectedQuantity.value);
      trackAddToCartEvent(selectedDish.value, selectedQuantity.value);
      onSuccess?.();
    } finally {
      isLoading.value = false;
    }
  }

  /** `dishId`: the dish a variant belongs to (omitted for a dish). */
  function setSelectedDish(dish: OrderableDish, dishId?: Id) {
    selectedDish.value = dish;
    selectedDishId.value = dishId ?? dish.id;
  }

  function setSelectedExtras(extras: Extra[]) {
    selectedExtras.value = extras;
  }

  function setRemovedIngredients(ingredients: string[]) {
    removedIngredients.value = ingredients;
  }

  return {
    selectedDish,
    selectedExtras,
    removedIngredients,
    selectedQuantity,
    cartItemLabel,
    isLoading,
    addToCart,
    setSelectedDish,
    setSelectedExtras,
    setRemovedIngredients,
  };
}
