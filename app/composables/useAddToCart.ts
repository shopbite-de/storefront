import type { Schemas, operations } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";

const UUID_NAMESPACE = "b098ef7e-0fa2-4073-b002-7ceec4360fbf";
const LINE_ITEM_PRODUCT = "product";
const LINE_ITEM_CONTAINER = "container";

export function useAddToCart() {
  const { addLineItems } = useCartMutations();
  // Feedback is the cart bar / header badge animation, not a toast (#325).
  const { triggerCartItemAdded } = useProductEvents();
  const { trackAddToCart: trackAddToCartEvent } = useTrackEvent();

  const selectedExtras = ref<AssociationItemProduct[]>([]);
  const deselectedIngredients = ref<string[]>([]);
  const selectedQuantity = ref(1);
  const selectedProduct = ref<Schemas["Product"] | null>(null);
  const isLoading = ref(false);

  const cartItemLabel = computed(() => {
    if (!selectedProduct.value) return "";

    const formatIngredientModifications = (
      items: Array<{ label: string } | string>,
      prefix: string,
    ): string => {
      if (!items.length) return "";

      const labels = items.map((item) =>
        typeof item === "string" ? item : item.label,
      );
      const separator = " " + prefix;
      return " " + prefix + labels.join(separator);
    };

    const extrasFormatted = formatIngredientModifications(
      selectedExtras.value,
      "+",
    );
    const removedFormatted = formatIngredientModifications(
      deselectedIngredients.value,
      "-",
    );

    console.log(
      selectedProduct.value.translated.name,
      extrasFormatted,
      removedFormatted,
    );

    return `${selectedProduct.value.translated.name}${extrasFormatted}${removedFormatted}`;
  });

  const createExtras = () =>
    selectedExtras.value.map((extra) => ({
      id: extra.value,
      type: LINE_ITEM_PRODUCT,
      quantity: selectedQuantity.value,
    }));

  const generateSortedExtrasString = (extras: AssociationItemProduct[]) =>
    extras
      .map((extra) => extra.value)
      .sort()
      .join("");

  const generateProductId = (
    baseId: string,
    extras: AssociationItemProduct[],
  ) => (extras.length ? baseId + generateSortedExtrasString(extras) : baseId);

  function createCartItems(): operations["addLineItem post /checkout/cart/line-item"]["body"]["items"] {
    if (!selectedProduct.value) return [];

    const extras = createExtras();

    // Container product when extras are selected
    const generatedUuid = uuidv5(
      generateProductId(selectedProduct.value.id, selectedExtras.value),
      UUID_NAMESPACE,
    );

    // Simple product when no extras
    if (extras.length === 0 && deselectedIngredients.value.length === 0) {
      return [
        {
          id: selectedProduct.value.id,
          quantity: selectedQuantity.value,
          type: LINE_ITEM_PRODUCT,
        },
      ];
    }

    return [
      {
        id: generatedUuid,
        quantity: selectedQuantity.value,
        type: LINE_ITEM_CONTAINER,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        label: cartItemLabel.value,
        payload: {
          productNumber: selectedProduct.value.productNumber,
        },
        children: [
          {
            id: uuidv4().replaceAll("-", ""),
            quantity: selectedQuantity.value,
            type: LINE_ITEM_PRODUCT,
            referencedId: selectedProduct.value.id,
          },
          ...extras,
        ],
      },
    ];
  }

  async function addToCart(onSuccess?: () => void) {
    if (!selectedProduct.value || isLoading.value) return;
    isLoading.value = true;

    try {
      // Failures are reported by useCartMutations; it resolves undefined.
      const newCart = await addLineItems(createCartItems());
      if (!newCart) return;

      triggerCartItemAdded(selectedProduct.value, selectedQuantity.value);
      trackAddToCartEvent(selectedProduct.value, selectedQuantity.value);
      onSuccess?.();
    } finally {
      isLoading.value = false;
    }
  }

  function setSelectedProduct(product: Schemas["Product"]) {
    selectedProduct.value = product;
  }

  function setSelectedExtras(extras: AssociationItemProduct[]) {
    selectedExtras.value = extras;
  }

  function setDeselectedIngredients(ingredients: string[]) {
    deselectedIngredients.value = ingredients;
  }

  return {
    selectedProduct,
    selectedExtras,
    deselectedIngredients,
    selectedQuantity,
    cartItemLabel,
    isLoading,
    addToCart,
    setSelectedProduct,
    setSelectedExtras,
    setDeselectedIngredients,
  };
}
