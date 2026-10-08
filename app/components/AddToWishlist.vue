<script setup lang="ts">
import type { Schemas } from "#shopware";

/** Wishlist toggle for a dish (`aria-pressed`, #445). */
const props = defineProps<{
  product: Schemas["Product"];
}>();

const { addToWishlist, isInWishlist, removeFromWishlist } = useProductWishlist(
  props.product.id,
);
const { trackAddToWishlist } = useTrackEvent();
const productName = computed(
  () => props.product.translated?.name ?? props.product.name ?? "Gericht",
);

const toggleWishlistProduct = async () => {
  try {
    if (isInWishlist.value) {
      await removeFromWishlist();
    } else {
      await addToWishlist();
      trackAddToWishlist(props.product);
    }
  } catch (error) {
    console.error("[wishlist][handleWishlistError]", error);
  }
};
</script>

<template>
  <SbIconButton
    :label="`${productName} merken`"
    :pressed="isInWishlist"
    variant="ghost"
    @click="toggleWishlistProduct"
  >
    <SbIcon name="heart" :filled="isInWishlist" />
  </SbIconButton>
</template>
