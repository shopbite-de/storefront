<script setup lang="ts">
import type { Schemas, operations } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";
import { v5 as uuidv5 } from "uuid";
import { computed, ref, toRefs } from "vue";
import { useTrackEvent } from "#imports";

const UUID_NAMESPACE = "b098ef7e-0fa2-4073-b002-7ceec4360fbf";
const CART_SUCCESS_TITLE = "Gute Wahl!";
const LINE_ITEM_PRODUCT = "product";
const LINE_ITEM_CONTAINER = "container";

const props = defineProps<{
  product: Schemas["Product"];
}>();
const { product } = toRefs(props);
const { addProducts, refreshCart } = useCart();
const toast = useToast();
const { triggerProductAdded } = useProductEvents();

const selectedExtras = ref<AssociationItemProduct[]>([]);
const deselectedIngredients = ref<string[]>([]);
const selectedQuantity = ref(1);
const selectedProduct = ref<Schemas["Product"]>(product.value);

const cartItemLabel = computed(() => {
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

const generateSortedExtrasString = (extras: AssociationItemProduct[]) =>
  extras
    .map((extra) => extra.value)
    .sort()
    .join("");

const generateProductId = (baseId: string, extras: AssociationItemProduct[]) =>
  extras.length ? baseId + generateSortedExtrasString(extras) : baseId;

function createCartItems(): operations["addLineItem post /checkout/cart/line-item"]["body"]["items"] {
  const extras = createExtras();

  // Simple product when no extras
  if (extras.length === 0 && deselectedIngredients.value.length === 0) {
    return [
      {
        id: selectedProduct.value.id,
        quantity: selectedQuantity.value,
        type: LINE_ITEM_PRODUCT,
        label: cartItemLabel.value,
      },
    ];
  }

  // Container product when extras are selected
  const generatedUuid = uuidv5(
    generateProductId(selectedProduct.value.id, selectedExtras.value),
    UUID_NAMESPACE,
  );

  return [
    {
      id: generatedUuid,
      quantity: selectedQuantity.value,
      type: LINE_ITEM_CONTAINER,
      label: cartItemLabel.value,
      payload: {
        productNumber: selectedProduct.value.productNumber,
      },
      children: [
        {
          id: selectedProduct.value.id,
          quantity: selectedQuantity.value,
          type: LINE_ITEM_PRODUCT,
        },
        ...extras,
      ],
    },
  ];
}

// Toast Notification
async function showSuccessToast() {
  toast.add({
    title: CART_SUCCESS_TITLE,
    description: `${selectedProduct.value.translated.name} wurde in den Warenkorb gelegt.`,
    icon: "i-lucide-shopping-cart",
    color: "success",
    progress: false,
  });
}

// Add to Cart
async function addToCart() {
  const cartItems = createCartItems();
  const newCart = await addProducts(cartItems);
  await refreshCart(newCart);
  await showSuccessToast();
  emit("product-added");
  triggerProductAdded(); // Clear search globally
  useTrackEvent("add_to_cart", {
    props: {
      product_number: selectedProduct.value.productNumber,
      quantity: selectedQuantity.value,
    },
  });
}

// Event Handlers
const onVariantSwitched = (variant: Schemas["Product"]) => {
  selectedProduct.value = variant;
};

const onExtrasSelected = (extras: AssociationItemProduct[]) => {
  selectedExtras.value = extras;
};

const onIngredientsDeselected = (deselected: string[]) => {
  deselectedIngredients.value = deselected;
};
const emit = defineEmits(["product-added"]);
</script>

<template>
  <div class="flex flex-col justify-between w-full">
    <div>
      <ProductConfigurator
        :parent-product="product"
        @variant-switched="onVariantSwitched"
      />
      <ProductCrossSelling
        :product="selectedProduct"
        @extras-selected="onExtrasSelected"
      />
      <ProductDeselectIngredient
        :product="selectedProduct"
        @ingredients-deselected="onIngredientsDeselected"
      />
    </div>
    <div class="flex flex-row gap-4 mt-8">
      <UInputNumber
        v-model="selectedQuantity"
        size="xl"
        placeholder="Anzahl"
        :min="1"
        :max="100"
      />
      <UButton
        size="xl"
        label="In den Warenkorb"
        icon="i-lucide-shopping-cart"
        block
        @click="addToCart"
      />
    </div>
  </div>
</template>
