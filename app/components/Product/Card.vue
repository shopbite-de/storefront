<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
  withFavoriteButton: boolean;
  // The whole card opens the product quick view (`select`), see
  // useProductQuickView (#325).
  selectable: boolean;
}>();

const emit = defineEmits<{
  select: [product: Schemas["Product"]];
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

const coverMedia = computed(() => product.value.cover?.media);
const isAvailable = computed(() => productIsAvailable(product.value));

function select() {
  if (props.selectable) emit("select", product.value);
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
      class="relative flex h-full flex-col overflow-hidden rounded-xl bg-default shadow-md ring ring-default transition-shadow"
      :class="{
        'cursor-pointer hover:shadow-lg hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary':
          selectable,
      }"
      :role="selectable ? 'button' : undefined"
      :tabindex="selectable ? 0 : undefined"
      :aria-haspopup="selectable ? 'dialog' : undefined"
      :aria-label="
        selectable
          ? `${product.translated.name ?? product.name} auswählen`
          : undefined
      "
      @click="select"
      @keydown.enter.prevent="select"
      @keydown.space.prevent="select"
    >
      <div v-if="coverMedia?.url" class="relative">
        <img
          :src="coverMedia.url"
          :srcset="mediaSrcSet(coverMedia)"
          sizes="(min-width: 1280px) 400px, 100vw"
          :width="mediaSize(coverMedia)?.width"
          :height="mediaSize(coverMedia)?.height"
          :alt="product.translated.name ?? product.name"
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
      </div>

      <!-- Stops the click so the wishlist toggle does not open the quick view. -->
      <div
        v-if="withFavoriteButton"
        class="absolute top-2.5 right-2.5"
        @click.stop
        @keydown.stop
      >
        <AddToWishlist
          :product="product"
          variant="soft"
          class="rounded-full bg-default/90"
        />
      </div>

      <div class="flex flex-1 flex-col gap-3 p-4">
        <div
          class="flex items-start justify-between gap-3"
          :class="{ 'pr-10': withFavoriteButton && !coverMedia?.url }"
        >
          <div class="flex min-w-0 flex-col gap-0.5">
            <span
              class="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              #{{ product.productNumber }}
              <ProductCardKitchen :sorted-properties="sortedProperties" />
            </span>
            <h3 class="text-lg font-bold text-pretty text-highlighted">
              {{ product.translated.name ?? product.name }}
            </h3>
            <p v-if="product.description" class="text-sm text-default">
              {{ product.description }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end">
            <span class="text-lg font-bold whitespace-nowrap text-highlighted">
              {{ getFormattedPrice(product.calculatedPrice.totalPrice) }}
            </span>
            <span
              v-if="!isAvailable"
              class="text-xs whitespace-nowrap text-error"
            >
              Ausverkauft
            </span>
            <span
              v-else-if="inCartQuantity > 0"
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
      </div>
    </article>
  </AnimatedSection>
</template>
