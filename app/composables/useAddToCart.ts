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

    return `${selectedProduct.value.translated.name}${extrasFormatted}${removedFormatted}`;
  });

  const createExtras = () =>
    selectedExtras.value.map((extra) => ({
      id: extra.value,
      type: LINE_ITEM_PRODUCT,
      quantity: selectedQuantity.value,
    }));

  /** The removed ingredients as the plugin takes them (`payload.without`). */
  const removedIngredients = () => [
    ...new Set(
      deselectedIngredients.value
        .map((name) => name.trim())
        .filter((name) => name !== ""),
    ),
  ];

  /**
   * Seed of the container line item id. Shopware merges a line item into an
   * existing one with the same id (quantity added, label and children kept),
   * so the whole configuration belongs in it: the extras and the removed
   * ingredients. Without removals the seed stays the product id plus the
   * sorted extra ids, so lines already in a cart keep their id.
   */
  const generateLineItemSeed = (
    baseId: string,
    extras: AssociationItemProduct[],
    without: string[],
  ) => {
    const extrasSeed = extras
      .map((extra) => extra.value)
      .sort()
      .join("");
    const withoutSeed = [
      ...new Set(without.map((name) => name.toLocaleLowerCase("de"))),
    ]
      .sort()
      .join("|");

    return withoutSeed
      ? `${baseId}${extrasSeed}|without:${withoutSeed}`
      : `${baseId}${extrasSeed}`;
  };

  function createCartItems(): operations["addLineItem post /checkout/cart/line-item"]["body"]["items"] {
    if (!selectedProduct.value) return [];

    const extras = createExtras();
    const without = removedIngredients();

    // Simple product when no extras and nothing removed
    if (extras.length === 0 && without.length === 0) {
      return [
        {
          id: selectedProduct.value.id,
          quantity: selectedQuantity.value,
          type: LINE_ITEM_PRODUCT,
        },
      ];
    }

    // Container product when extras are selected or ingredients removed
    return [
      {
        id: uuidv5(
          generateLineItemSeed(
            selectedProduct.value.id,
            selectedExtras.value,
            without,
          ),
          UUID_NAMESPACE,
        ),
        quantity: selectedQuantity.value,
        type: LINE_ITEM_CONTAINER,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        label: cartItemLabel.value,
        payload: {
          productNumber: selectedProduct.value.productNumber,
          without,
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
