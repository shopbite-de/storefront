<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const { apiClient } = useShopwareContext();

const productId = toRef(props.product.id);
const { data: productDetails, pending } = useAsyncData(
  () => `product-${productId.value ?? "none"}`,
  async () => {
    if (!productId.value) return null;
    const response = await apiClient.invoke(
      "readProductDetail post /product/{productId}",
      {
        pathParams: { productId: productId.value },
      },
    );
    return response.data;
  },
);

const {
  selectedProduct,
  selectedQuantity,
  addToCart,
  setSelectedProduct,
  setSelectedExtras,
  setDeselectedIngredients,
} = useAddToCart();

// Initialize when productDetails is loaded
watch(
  () => productDetails.value?.product,
  (product) => {
    if (product) {
      setSelectedProduct(product);
    }
  },
  { immediate: true },
);

const onVariantSwitched = (variant: Schemas["Product"]) => {
  setSelectedProduct(variant);
};

const onExtrasSelected = (extras: AssociationItemProduct[]) => {
  setSelectedExtras(extras);
};

const onIngredientsDeselected = (deselected: string[]) => {
  setDeselectedIngredients(deselected);
};

const onAddToCart = () => emit("product-added");

const emit = defineEmits(["product-added"]);
</script>

<template>
  <div v-if="!pending">
    <div v-if="productDetails?.configurator">
      <ProductConfigurator2
        v-if="productDetails?.configurator"
        :p="product"
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
        size="xl"
        label="In den Warenkorb"
        icon="i-lucide-shopping-cart"
        block
        @click="addToCart(onAddToCart)"
      />
    </div>
  </div>
</template>
