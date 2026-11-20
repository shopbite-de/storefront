import type { Extra } from "../../shared/domain";
import type { OrderableDish } from "../utils/dish";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";

const UUID_NAMESPACE = "b098ef7e-0fa2-4073-b002-7ceec4360fbf";
const LINE_ITEM_PRODUCT = "product";
const LINE_ITEM_CONTAINER = "container";

type CartItems = Parameters<
  ReturnType<typeof useCartMutations>["addLineItems"]
>[0];

/**
 * Adds a dish configuration to the cart: the dish (or the chosen variant)
 * with its extras and removed ingredients, as the domain types of the
 * menu (ADR 0001, step 2). The cart is still Shopware's until step 4: a
 * dish with extras or removals is a `container` line item whose id is the
 * whole configuration.
 */
export function useAddToCart() {
  const { addLineItems } = useCartMutations();
  // Feedback is the cart bar / header badge animation, not a toast (#325).
  const { triggerCartItemAdded } = useProductEvents();
  const { trackAddToCart: trackAddToCartEvent } = useTrackEvent();

  const selectedExtras = ref<Extra[]>([]);
  const removedIngredients = ref<string[]>([]);
  const selectedQuantity = ref(1);
  const selectedDish = ref<OrderableDish | null>(null);
  const isLoading = ref(false);

  const cartItemLabel = computed(() => {
    if (!selectedDish.value) return "";

    const formatModifications = (labels: string[], prefix: string): string => {
      if (!labels.length) return "";
      const separator = " " + prefix;
      return " " + prefix + labels.join(separator);
    };

    const extrasFormatted = formatModifications(
      selectedExtras.value.map((extra) => extra.name),
      "+",
    );
    const removedFormatted = formatModifications(removedIngredients.value, "-");

    return `${selectedDish.value.name}${extrasFormatted}${removedFormatted}`;
  });

  const createExtras = () =>
    selectedExtras.value.map((extra) => ({
      id: extra.id,
      type: LINE_ITEM_PRODUCT,
      quantity: selectedQuantity.value,
    }));

  /** The removed ingredients as the plugin takes them (`payload.without`). */
  const removedNames = () => [
    ...new Set(
      removedIngredients.value
        .map((name) => name.trim())
        .filter((name) => name !== ""),
    ),
  ];

  /**
   * Seed of the container line item id. Shopware merges a line item into an
   * existing one with the same id (quantity added, label and children kept),
   * so the whole configuration belongs in it: the extras and the removed
   * ingredients. Without removals the seed stays the dish id plus the
   * sorted extra ids, so lines already in a cart keep their id.
   */
  const generateLineItemSeed = (
    baseId: string,
    extras: Extra[],
    without: string[],
  ) => {
    const extrasSeed = extras
      .map((extra) => extra.id)
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

  function createCartItems(): CartItems {
    if (!selectedDish.value) return [];

    const extras = createExtras();
    const without = removedNames();

    // A plain line without extras and removals
    if (extras.length === 0 && without.length === 0) {
      return [
        {
          id: selectedDish.value.id,
          quantity: selectedQuantity.value,
          type: LINE_ITEM_PRODUCT,
        },
      ];
    }

    // A container line when extras are selected or ingredients removed
    return [
      {
        id: uuidv5(
          generateLineItemSeed(
            selectedDish.value.id,
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
          productNumber: selectedDish.value.number,
          without,
        },
        children: [
          {
            id: uuidv4().replaceAll("-", ""),
            quantity: selectedQuantity.value,
            type: LINE_ITEM_PRODUCT,
            referencedId: selectedDish.value.id,
          },
          ...extras,
        ],
      },
    ];
  }

  async function addToCart(onSuccess?: () => void) {
    if (!selectedDish.value || isLoading.value) return;
    isLoading.value = true;

    try {
      // Failures are reported by useCartMutations; it resolves undefined.
      const newCart = await addLineItems(createCartItems());
      if (!newCart) return;

      triggerCartItemAdded(selectedDish.value, selectedQuantity.value);
      trackAddToCartEvent(selectedDish.value, selectedQuantity.value);
      onSuccess?.();
    } finally {
      isLoading.value = false;
    }
  }

  function setSelectedDish(dish: OrderableDish) {
    selectedDish.value = dish;
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
