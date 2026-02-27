<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const { addToWishlist, isInWishlist, removeFromWishlist } = useProductWishlist(
  props.product.id,
);
const { trackAddToWishlist } = useTrackEvent();

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

// Computed tooltip text
const tooltipText = computed(() =>
  isInWishlist.value
    ? "Von der Merkliste entfernen"
    : "Auf die Merkliste setzten",
);
</script>

<template>
  <UTooltip :text="tooltipText">
    <UButton
      icon="i-lucide-heart"
      variant="ghost"
      :color="isInWishlist ? 'error' : 'neutral'"
      @click="toggleWishlistProduct"
    />
  </UTooltip>
</template>
