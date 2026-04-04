<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
  withFavoriteButton: boolean;
  withAddToCartButton: boolean;
}>();

const { product } = toRefs(props);

const sortedProperties = computed(
  () =>
    product.value.sortedProperties as Schemas["PropertyGroup"][] | undefined,
);

const price = ref(product.value.calculatedPrice.totalPrice);
const label = ref(product.value.translated.name ?? product.value.name);
const description = ref(product.value.description);
const number = ref(product.value.productNumber);

function onVariantSelected(variant: Schemas["Product"]) {
  price.value = variant.calculatedPrice.totalPrice;
  label.value = variant.translated.name ?? variant.name;
  description.value = variant.translated.description ?? variant.description;
  number.value = variant.productNumber;
}
</script>

<template>
  <AnimatedSection
    :id="`product-card-${product.id}`"
    animation="fade-up"
    duration="duration-1000"
    delay="delay-100"
  >
    <UPageCard
      :orientation="product.cover?.media?.url ? 'horizontal' : 'vertical'"
      variant="outline"
      reverse
      :ui="{ footer: 'w-full', root: 'shadow-lg' }"
    >
      <template #header>
        <ProductCardDietBadges :sorted-properties="sortedProperties" />
      </template>

      <div v-if="product.cover?.media?.url">
        <LazyNuxtImg
          :src="product.cover.media.url"
          class="rounded-md h-auto max-w-full object-contain transition-opacity duration-700"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>

      <template #title>
        <div class="flex flex-row items-center gap-1">
          <span class="text-sm text-brand-500">#{{ number }}</span>
          <ProductCardKitchen :sorted-properties="sortedProperties" />
          <p class="text-base text-pretty font-semibold text-highlighted">
            {{ label }}
          </p>
        </div>
      </template>

      <template #description>
        <ProductCardDescription
          :description="description"
          :sorted-properties="sortedProperties"
        />
      </template>

      <template #footer>
        <ProductCardFooter
          :price="price"
          :product="product"
          :with-favorite-button="withFavoriteButton"
          :with-add-to-cart-button="withAddToCartButton"
          @variant-selected="onVariantSelected"
        />
      </template>
    </UPageCard>
  </AnimatedSection>
</template>
