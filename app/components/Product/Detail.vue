<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";

const props = defineProps<{
  productId: string;
}>();

const emit = defineEmits(["product-added", "variant-selected"]);

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

function onExtras(extras: AssociationItemProduct[]) {
  selectedExtras.value = extras;
  onExtrasSelected(extras);
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
};

const onAddToCart = () => emit("product-added");
</script>

<template>
  <div class="flex flex-1 flex-col gap-5">
    <!-- One placeholder in the shape of the loaded body (options,
         ingredients, extras), shown until product and extras are both
         loaded. -->
    <div v-if="pending" class="flex flex-col gap-5" aria-busy="true">
      <div class="flex flex-col gap-2">
        <USkeleton class="h-5 w-24" />
        <USkeleton class="h-11 w-full" />
      </div>
      <div class="flex flex-col gap-2">
        <USkeleton class="h-5 w-20" />
        <div class="flex flex-wrap gap-2">
          <USkeleton class="h-8 w-20 rounded-full" />
          <USkeleton class="h-8 w-24 rounded-full" />
          <USkeleton class="h-8 w-16 rounded-full" />
          <USkeleton class="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <USkeleton class="h-5 w-28" />
        <USkeleton v-for="row in 4" :key="row" class="h-7 w-full" />
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
        @ingredients-deselected="onIngredientsDeselected"
      />
      <ProductCrossSelling
        v-if="associationItems.length > 0"
        :associations="associationItems"
        @extras-selected="onExtras"
      />
    </template>

    <div
      class="sticky bottom-0 mt-auto flex items-center gap-3 border-t border-default bg-default pt-4"
    >
      <UInputNumber
        v-model="selectedQuantity"
        size="xl"
        aria-label="Anzahl"
        :min="1"
        :max="100"
        :disabled="pending"
        class="w-28 shrink-0"
      />
      <!-- Short label: "In den Warenkorb" wrapped next to the total on phones. -->
      <UButton
        class="flex-1 justify-between whitespace-nowrap"
        size="xl"
        icon="i-lucide-shopping-cart"
        :disabled="isLoading || pending || !isAvailable"
        :loading="isLoading"
        aria-label="In den Warenkorb"
        @click="addToCart(onAddToCart)"
      >
        <span>{{ isAvailable ? "Hinzufügen" : "Ausverkauft" }}</span>
        <span v-if="isAvailable && !pending" class="font-bold">
          {{ getFormattedPrice(total) }}
        </span>
      </UButton>
    </div>
  </div>
</template>
