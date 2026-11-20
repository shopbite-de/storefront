import { ref, watch } from "vue";
import type { Dish } from "../../shared/domain";

export type CartAddition = {
  id: number;
  /** The dish (or variant) that went into the cart. */
  dish: Pick<Dish, "id" | "number" | "name">;
  quantity: number;
};

const productAddedTrigger = ref(0);
const lastCartAddition = ref<CartAddition | null>(null);

export const useProductEvents = () => {
  /** Product added to the cart or the wishlist; closes the search. */
  const triggerProductAdded = () => {
    productAddedTrigger.value++;
  };

  /** A dish went into the cart; the cart bar and the header badge react (#325). */
  const triggerCartItemAdded = (
    dish: Pick<Dish, "id" | "number" | "name">,
    quantity: number,
  ) => {
    lastCartAddition.value = {
      id: productAddedTrigger.value + 1,
      dish: { id: dish.id, number: dish.number, name: dish.name },
      quantity,
    };
    triggerProductAdded();
  };

  const onProductAdded = (callback: () => void) => {
    watch(productAddedTrigger, () => {
      if (productAddedTrigger.value > 0) {
        callback();
      }
    });
  };

  const onCartItemAdded = (callback: (addition: CartAddition) => void) => {
    watch(lastCartAddition, (addition) => {
      if (addition) callback(addition);
    });
  };

  return {
    triggerProductAdded,
    triggerCartItemAdded,
    onProductAdded,
    onCartItemAdded,
  };
};
