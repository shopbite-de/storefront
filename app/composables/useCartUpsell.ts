import type { Dish } from "../../shared/domain";

/**
 * Suggestions on the order confirmation step (#338): the upsell dishes of
 * the menu (`/api/menu/upsell`, never a parent with variants), added with
 * quantity 1 in one click. Named "upsell" because the extras of a dish are
 * offered in its sheet.
 */
export function useCartUpsell() {
  const { addLine } = useCartMutations();
  const { triggerCartItemAdded } = useProductEvents();
  const { trackUpsellAdd } = useTrackEvent();

  const pendingDishIds = ref(new Set<string>());

  async function loadUpsellDishes(): Promise<readonly Dish[]> {
    try {
      return await $fetch<readonly Dish[]>("/api/menu/upsell");
    } catch (e) {
      console.error("[useCartUpsell][loadUpsellDishes]", e);
      return [];
    }
  }

  function isAdding(dishId: string): boolean {
    return pendingDishIds.value.has(dishId);
  }

  async function addUpsellDish(dish: Dish): Promise<void> {
    if (isAdding(dish.id)) return;
    pendingDishIds.value.add(dish.id);

    try {
      // Failures are reported by useCartMutations; it resolves undefined.
      const newCart = await addLine({
        dishId: dish.id,
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
        quantity: 1,
      });
      if (!newCart) return;

      triggerCartItemAdded(dish, 1);
      trackUpsellAdd(dish, 1);
    } finally {
      pendingDishIds.value.delete(dish.id);
    }
  }

  return {
    loadUpsellDishes,
    addUpsellDish,
    isAdding,
  };
}
