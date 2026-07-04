<script setup lang="ts">
import type { Schemas } from "#shopware";

defineProps<{
  price: number;
  product: Schemas["Product"];
  withFavoriteButton: boolean;
  withAddToCartButton: boolean;
}>();

const emit = defineEmits<{
  variantSelected: [variant: Schemas["Product"]];
}>();

const { isCheckoutEnabled } = useShopBiteConfig();

const { getFormattedPrice } = useCommercePrice();

const openDetails = ref(false);

function toggleDetails() {
  openDetails.value = !openDetails.value;
}
</script>

<template>
  <div class="flex flex-row justify-between content-center w-full">
    <p>{{ getFormattedPrice(price) }}</p>
    <div class="flex flex-row gap-2">
      <AddToWishlist v-if="withFavoriteButton" :product="product" />
      <UButton
        v-if="withAddToCartButton && isCheckoutEnabled"
        icon="i-lucide-shopping-cart"
        variant="subtle"
        aria-label="Öffnet Produkt-Optionen"
        @click="toggleDetails"
      />
    </div>
  </div>
  <ClientOnly>
    <UCollapsible v-model:open="openDetails" class="flex flex-col gap-2">
      <template #content>
        <LazyProductDetail
          :product-id="product.id"
          @product-added="toggleDetails"
          @variant-selected="emit('variantSelected', $event)"
        />
      </template>
    </UCollapsible>
  </ClientOnly>
</template>
