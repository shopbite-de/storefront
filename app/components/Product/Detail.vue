<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";
import type { QuickViewConfiguration } from "~/utils/productUrl";

const props = defineProps<{
  productId: string;
  // Configuration from the quick view URL (#411).
  initialWithout?: string[];
  initialExtras?: string[];
}>();

const emit = defineEmits<{
  "product-added": [];
  "variant-selected": [variant: Schemas["Product"]];
  "configuration-changed": [configuration: QuickViewConfiguration];
}>();

const {
  productDetails,
  associationItems,
  pending,
  selectedProduct,
  selectedQuantity,
  isLoading,
  addToCart,
  setSelectedProduct,
  onExtrasSelected,
  onIngredientsDeselected,
} = useProductDetail(() => props.productId);

const { getFormattedPrice } = useCommercePrice();

const selectedExtras = ref<AssociationItemProduct[]>([]);
const deselectedIngredients = ref<string[]>([]);

function onExtras(extras: AssociationItemProduct[]) {
  selectedExtras.value = extras;
  onExtrasSelected(extras);
  emitConfiguration();
}

function onIngredients(deselected: string[]) {
  deselectedIngredients.value = deselected;
  onIngredientsDeselected(deselected);
  emitConfiguration();
}

function emitConfiguration() {
  const productNumber = selectedProduct.value?.productNumber;
  if (!productNumber) return;
  emit("configuration-changed", {
    productNumber,
    without: deselectedIngredients.value,
    extras: selectedExtras.value
      .map((extra) => extra.productNumber)
      .filter((number): number is string => !!number),
  });
}

// Unit price plus extras, times the quantity: what the button will add.
const total = computed(() => {
  const unitPrice = selectedProduct.value?.calculatedPrice.unitPrice ?? 0;
  const extrasPrice = selectedExtras.value.reduce(
    (sum, extra) => sum + (extra.unitPrice ?? 0),
    0,
  );
  return (unitPrice + extrasPrice) * selectedQuantity.value;
});

const isAvailable = computed(() =>
  selectedProduct.value ? productIsAvailable(selectedProduct.value) : true,
);

const onVariantSwitched = (variant: Schemas["Product"]) => {
  setSelectedProduct(variant);
  emit("variant-selected", variant);
  emitConfiguration();
};

const onAddToCart = () => emit("product-added");

const productName = computed(
  () => selectedProduct.value?.translated?.name ?? "Gericht",
);
</script>

<template>
  <div class="flex flex-1 flex-col gap-5">
    <!-- One placeholder in the shape of the loaded body (options,
         ingredients, extras), shown until product and extras are both
         loaded. -->
    <div
      v-if="pending"
      class="flex flex-col gap-5 motion-safe:animate-pulse"
      aria-busy="true"
    >
      <div class="flex flex-col gap-2">
        <div class="h-5 w-24 rounded bg-sb-muted" />
        <div class="h-11 w-full rounded bg-sb-muted" />
      </div>
      <div class="flex flex-col gap-2">
        <div class="h-5 w-20 rounded bg-sb-muted" />
        <div class="flex flex-wrap gap-2">
          <div class="h-8 w-20 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-24 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-16 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-28 rounded-full rounded bg-sb-muted" />
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="h-5 w-28 rounded bg-sb-muted" />
        <div
          v-for="row in 4"
          :key="row"
          class="h-7 w-full rounded bg-sb-muted"
        />
      </div>
    </div>
    <template v-else-if="productDetails?.configurator">
      <ProductConfigurator
        :p="productDetails.product"
        :c="productDetails.configurator"
        @variant-switched="onVariantSwitched"
      />
      <ProductDeselectIngredient
        v-if="selectedProduct"
        :product="selectedProduct"
        :initial-deselected="initialWithout"
        @ingredients-deselected="onIngredients"
      />
      <ProductCrossSelling
        v-if="associationItems.length > 0"
        :associations="associationItems"
        :initial-extras="initialExtras"
        @extras-selected="onExtras"
      />
    </template>

    <!-- -bottom-5/-mb-5 cover the sheet body's bottom padding, which sticky
         positioning keeps free and the list scrolled through (#442). -->
    <div
      class="sticky -bottom-5 -mx-5 -mb-5 mt-auto flex items-center gap-2.5 border-t border-sb-line bg-sb-surface px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <SbStepper
        v-model="selectedQuantity"
        :item-name="productName"
        :max="100"
        size="lg"
      />
      <SbButton
        size="lg"
        class="min-h-14 min-w-0 flex-1 justify-between px-5"
        :disabled="pending || !isAvailable"
        :loading="isLoading"
        @click="addToCart(onAddToCart)"
      >
        <span>{{ isAvailable ? "In den Warenkorb" : "Ausverkauft" }}</span>
        <span v-if="isAvailable && !pending" class="tabular-nums">
          {{ getFormattedPrice(total) }}
        </span>
      </SbButton>
    </div>
  </div>
</template>
