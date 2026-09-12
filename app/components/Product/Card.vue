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

const { getFormattedPrice } = useCommercePrice();
const { quantity: inCartQuantity } = useProductCartQuantity(
  () => product.value.id,
);

const price = ref(product.value.calculatedPrice.totalPrice);
const label = ref(product.value.translated.name ?? product.value.name);
const description = ref(product.value.description);
const number = ref(product.value.productNumber);

const coverMedia = computed(() => product.value.cover?.media);

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
    <article
      class="flex h-full flex-col overflow-hidden rounded-xl bg-default shadow-md ring ring-default"
    >
      <div v-if="coverMedia?.url" class="relative">
        <img
          :src="coverMedia.url"
          :srcset="mediaSrcSet(coverMedia)"
          sizes="(min-width: 1280px) 400px, 100vw"
          :width="mediaSize(coverMedia)?.width"
          :height="mediaSize(coverMedia)?.height"
          :alt="label"
          loading="lazy"
          decoding="async"
          class="h-44 w-full object-cover"
        />
        <div class="absolute top-2.5 left-2.5 flex gap-1.5">
          <ProductCardDietBadges
            :sorted-properties="sortedProperties"
            variant="overlay"
          />
        </div>
        <AddToWishlist
          v-if="withFavoriteButton"
          :product="product"
          variant="soft"
          class="absolute top-2.5 right-2.5 rounded-full bg-default/90"
        />
      </div>

      <div class="flex flex-1 flex-col gap-3 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span
              class="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              #{{ number }}
              <ProductCardKitchen :sorted-properties="sortedProperties" />
            </span>
            <h3 class="text-lg font-bold text-pretty text-highlighted">
              {{ label }}
            </h3>
            <p v-if="description" class="text-sm text-default">
              {{ description }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end">
            <span class="text-lg font-bold whitespace-nowrap text-highlighted">
              {{ getFormattedPrice(price) }}
            </span>
            <span
              v-if="inCartQuantity > 0"
              class="text-xs whitespace-nowrap text-muted"
              data-testid="in-cart-quantity"
            >
              {{ inCartQuantity }}× im Warenkorb
            </span>
          </div>
        </div>

        <ProductCardIngredients
          :sorted-properties="sortedProperties"
          :with-diet-badges="!coverMedia?.url"
        />

        <ProductCardFooter
          class="mt-auto"
          :product="product"
          :with-favorite-button="withFavoriteButton && !coverMedia?.url"
          :with-add-to-cart-button="withAddToCartButton"
          @variant-selected="onVariantSelected"
        />
      </div>
    </article>
  </AnimatedSection>
</template>
