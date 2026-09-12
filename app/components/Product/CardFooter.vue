<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
  withFavoriteButton: boolean;
  withAddToCartButton: boolean;
}>();

const emit = defineEmits<{
  variantSelected: [variant: Schemas["Product"]];
}>();

const { isCheckoutEnabled } = useShopBiteConfig();
const { isLoading, addToCart, setSelectedProduct } = useAddToCart();

// Variants or extras need a choice first; everything else goes straight
// into the cart (#325).
const hasOptions = computed(() => productHasOptions(props.product));
const isAvailable = computed(() => productIsAvailable(props.product));
const canCustomise = computed(
  () =>
    getMainIngredients(
      props.product.sortedProperties as Schemas["PropertyGroup"][] | undefined,
    ).length > 0,
);

const primaryLabel = computed(() => {
  if (!isAvailable.value) return "Ausverkauft";
  return hasOptions.value ? "Auswählen" : "In den Warenkorb";
});

const openDetails = ref(false);
// The collapsible is created on the first toggle: mounting one per card
// (with its height measurement) was a large part of the listing's
// hydration cost (#314). Never rendered on the server.
const detailsMounted = ref(false);

async function toggleDetails() {
  if (!detailsMounted.value) {
    detailsMounted.value = true;
    await nextTick();
  }
  openDetails.value = !openDetails.value;
}

async function onPrimaryClick() {
  if (hasOptions.value) {
    await toggleDetails();
    return;
  }
  setSelectedProduct(props.product);
  await addToCart();
}

function onProductAdded() {
  openDetails.value = false;
}
</script>

<template>
  <div class="flex items-center gap-2">
    <AddToWishlist
      v-if="withFavoriteButton"
      :product="product"
      size="xl"
      variant="outline"
    />
    <UButton
      v-if="canCustomise && !hasOptions && isAvailable"
      label="Anpassen"
      variant="ghost"
      color="neutral"
      size="xl"
      aria-label="Produkt-Optionen öffnen"
      :aria-expanded="openDetails"
      @click="toggleDetails"
    />
    <UButton
      v-if="withAddToCartButton && isCheckoutEnabled"
      class="flex-1 justify-center"
      size="xl"
      variant="subtle"
      icon="i-lucide-shopping-cart"
      :label="primaryLabel"
      :disabled="!isAvailable || isLoading"
      :loading="isLoading"
      :aria-expanded="hasOptions ? openDetails : undefined"
      @click="onPrimaryClick"
    />
  </div>
  <UCollapsible
    v-if="detailsMounted"
    v-model:open="openDetails"
    class="flex flex-col gap-2"
  >
    <template #content>
      <LazyProductDetail
        :product-id="product.id"
        @product-added="onProductAdded"
        @variant-selected="emit('variantSelected', $event)"
      />
    </template>
  </UCollapsible>
</template>
