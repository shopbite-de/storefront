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
  return (
    "#" + product.value.productNumber + " " + product.value.translated.name
  );
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
  <AnimatedSection
    animation="fade-up"
    duration="duration-1000"
    delay="delay-100"
  >
    <UPageCard
      :title="title"
      :description="product.description"
      :orientation="product.cover?.media?.url ? 'horizontal' : 'vertical'"
      variant="soft"
      reverse
      :ui="{ footer: 'w-full' }"
      :icon="isVegi ? 'i-lucide-leaf' : ''"
    >
      <div v-if="product.cover?.media?.url">
        <NuxtImg
          :src="product.cover.media.url"
          class="rounded-md h-auto max-w-full object-contain ransition-opacity duration-700"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>

      <template #title>
        <div class="flex flex-row items-baseline gap-1">
          <span class="text-sm text-brand-900"
            >#{{ product.productNumber }}</span
          >

          <p class="text-base text-pretty font-semibold text-highlighted">
            {{ product.translated.name }}
          </p>
        </div>
      </template>

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
  </AnimatedSection>
</template>
