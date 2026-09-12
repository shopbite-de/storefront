import type { Schemas } from "#shopware";
import { ref, watch } from "vue";

export type CartAddition = {
  id: number;
  product: Schemas["Product"];
  quantity: number;
};

const productAddedTrigger = ref(0);
const lastCartAddition = ref<CartAddition | null>(null);

export const useProductEvents = () => {
  /** Product added to the cart or the wishlist; closes the search. */
  const triggerProductAdded = () => {
    productAddedTrigger.value++;
  };

  /** A product went into the cart; the cart bar and the header badge react (#325). */
  const triggerCartItemAdded = (
    product: Schemas["Product"],
    quantity: number,
  ) => {
    lastCartAddition.value = {
      id: productAddedTrigger.value + 1,
      product,
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
