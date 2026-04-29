<script setup lang="ts">
import type { Product } from "~/types/commerce/product";

const props = defineProps<{
  productId: string;
}>();

const emit = defineEmits(["product-added", "variant-selected"]);

const {
  productDetails,
  pending,
  selectedProduct,
  selectedQuantity,
  isLoading,
  addToCart,
  setSelectedProduct,
  onExtrasSelected,
  onIngredientsDeselected,
} = useProductDetail(() => props.productId);

const onVariantSwitched = (variant: Product) => {
  setSelectedProduct(variant);
  emit("variant-selected", variant);
};

const onAddToCart = () => emit("product-added");
</script>

<template>
  <div v-if="!pending">
    <div v-if="productDetails?.configurator">
      <ProductConfigurator
        v-if="productDetails?.configurator"
        :p="productDetails.product"
        :c="productDetails.configurator"
        @variant-switched="onVariantSwitched"
      />
      <ProductCrossSelling
        v-if="selectedProduct"
        :product="selectedProduct"
        @extras-selected="onExtrasSelected"
      />
      <ProductDeselectIngredient
        v-if="selectedProduct"
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
        :disabled="isLoading"
        size="xl"
        label="In den Warenkorb"
        icon="i-lucide-shopping-cart"
        block
        @click="addToCart(onAddToCart)"
      />
    </div>
  </div>
</template>
