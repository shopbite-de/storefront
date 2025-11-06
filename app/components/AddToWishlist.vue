<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useTrackEvent } from "#imports";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const { addToWishlist, isInWishlist, removeFromWishlist } = useProductWishlist(
  props.product.id,
);
const { getWishlistProducts } = useWishlist();

const trackWishlistEvent = (
  action: "add_to_wishlist" | "remove_from_wishlist",
) => {
  useTrackEvent(action, {
    props: { product_number: props.product.productNumber },
  });
};

const toggleWishlistProduct = async () => {
  try {
    if (isInWishlist.value) {
      await removeFromWishlist();
      trackWishlistEvent("remove_from_wishlist");
      await getWishlistProducts();
    } else {
      await addToWishlist();
      trackWishlistEvent("add_to_wishlist");
      await getWishlistProducts();
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
