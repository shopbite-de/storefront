<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
  withFavoriteButton: boolean;
  withAddToCartButton: boolean;
}>();

const { isCheckoutEnabled } = usePizzaToppings();

const { product, withFavoriteButton, withAddToCartButton } = toRefs(props);

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});

const title = computed<string>(() => {
  return "#" + product.value.productNumber + " " + product.value.name;
});

const isVegi = computed<boolean>(() => {
  if (!product.value?.properties) {
    return false;
  }

  return product.value.sortedProperties.some(
    (propertyGroup: Schemas["PropertyGroup"]) =>
      propertyGroup.translated.name === "Typ" &&
      propertyGroup.options.some(
        (option: Schemas["PropertyGroupOption"]) =>
          option.translated.name === "Vegetarisch",
      ),
  );
});
const openDetails = ref(false);

function toggleDetails() {
  openDetails.value = !openDetails.value;
}
</script>

<template>
  <UPageCard
    :title="title"
    :description="product.description"
    :ui="{
      root: 'shadow-md rounded-md',
      footer: 'w-full',
    }"
    :icon="isVegi ? 'i-lucide-leaf' : ''"
  >
    <template #footer>
      <div class="flex flex-row justify-between content-center w-full">
        <p>{{ getFormattedPrice(product.calculatedPrice.totalPrice) }}</p>
        <div class="flex flex-row gap-2">
          <AddToWishlist v-if="withFavoriteButton" :product="product" />
          <UButton
            v-if="withAddToCartButton && isCheckoutEnabled"
            icon="i-lucide-shopping-cart"
            variant="subtle"
            @click="toggleDetails"
          />
        </div>
      </div>
      <UCollapsible v-model:open="openDetails" class="flex flex-col gap-2">
        <template #content>
          <ProductDetail :product="product" @product-added="toggleDetails" />
        </template>
      </UCollapsible>
    </template>
  </UPageCard>
</template>
