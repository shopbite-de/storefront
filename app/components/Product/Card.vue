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

const isVegi = computed<boolean>(() => {
  if (!product.value?.properties) {
    return false;
  }

  return product.value?.sortedProperties?.some(
    (propertyGroup: Schemas["PropertyGroup"]) =>
      propertyGroup.translated.name === "Vegetarisch" &&
      propertyGroup.options?.some(
        (option: Schemas["PropertyGroupOption"]) =>
          option.translated.name === "Ja",
      ),
  );
});
const openDetails = ref(false);

function toggleDetails() {
  openDetails.value = !openDetails.value;
}

const MAIN_INGREDIENTS_PROPERTY_LABEL = "Hauptzutaten";

const mainIngredients = computed<Schemas["PropertyGroupOption"][]>(() => {
  const sortedProps =
    product.value?.sortedProperties ?? ([] as Schemas["PropertyGroup"][]);
  const mainIngredientsProperty = sortedProps.find(
    (propertyGroup: Schemas["PropertyGroup"]) =>
      propertyGroup.translated.name === MAIN_INGREDIENTS_PROPERTY_LABEL,
  );
  return mainIngredientsProperty?.options ?? [];
});
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
        <UBadge
          v-if="isVegi"
          icon="i-lucide-leaf"
          color="success"
          variant="outline"
          size="sm"
          label="Vegetarisch"
        />
      </template>

      <div v-if="product.cover?.media?.url">
        <NuxtImg
          :src="product.cover.media.url"
          class="rounded-md h-auto max-w-full object-contain ransition-opacity duration-700"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>

      <template #title>
        <div class="flex flex-row items-baseline gap-1">
          <span class="text-sm text-brand-500"
            >#{{ product.productNumber }}</span
          >

          <p class="text-base text-pretty font-semibold text-highlighted">
            {{ product.translated.name ?? product.name }}
          </p>
        </div>
      </template>

      <template #description>
        <div class="flex flex-col gap-2">
          <div>{{ product.description }}</div>
          <div
            v-if="mainIngredients.length > 0"
            class="font-extralight text-sm text-pretty"
          >
            {{
              mainIngredients
                .map((ingredient) => ingredient.translated.name)
                .join(", ")
            }}
          </div>
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
            <ProductDetail2
              :product-id="product.id"
              @product-added="toggleDetails"
            />
          </template>
        </UCollapsible>
      </template>
    </UPageCard>
  </AnimatedSection>
</template>
