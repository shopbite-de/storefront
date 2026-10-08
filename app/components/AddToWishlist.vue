<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { ButtonProps } from "@nuxt/ui";

const props = withDefaults(
  defineProps<{
    product: Schemas["Product"];
    size?: ButtonProps["size"];
    variant?: ButtonProps["variant"];
  }>(),
  { size: "md", variant: "ghost" },
);

const { addToWishlist, isInWishlist, removeFromWishlist } = useProductWishlist(
  props.product.id,
);
const { trackAddToWishlist } = useTrackEvent();
const { hasPreset } = useThemePreset();
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

const tooltipText = computed(() =>
  isInWishlist.value
    ? "Von der Merkliste entfernen"
    : "Auf die Merkliste setzen",
);
</script>

<template>
  <SbIconButton
    v-if="hasPreset"
    :label="`${productName} merken`"
    :pressed="isInWishlist"
    variant="ghost"
    @click="toggleWishlistProduct"
  >
    <SbIcon name="heart" :filled="isInWishlist" />
  </SbIconButton>
  <UTooltip v-else :text="tooltipText">
    <UButton
      icon="i-lucide-heart"
      :size="size"
      :variant="variant"
      :color="isInWishlist ? 'error' : 'neutral'"
      :aria-label="tooltipText"
      @click="toggleWishlistProduct"
    />
  </UTooltip>
</template>
