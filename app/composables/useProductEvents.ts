import { ref, watch } from "vue";

const productAddedTrigger = ref(0);

export const useProductEvents = () => {
  const triggerProductAdded = () => {
    productAddedTrigger.value++;
  };

  const onProductAdded = (callback: () => void) => {
    watch(productAddedTrigger, () => {
      if (productAddedTrigger.value > 0) {
        callback();
      }
    });
  };

  return {
    triggerProductAdded,
    onProductAdded,
  };
};
