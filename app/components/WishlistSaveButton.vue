<script setup lang="ts">
import type { WishlistConfiguration } from "~/composables/useWishlistEntries";

/**
 * Saves the dish as configured right now (#467): variant, deselected
 * ingredients and extras. A toggle with `aria-pressed` and a stable name;
 * the pressed state follows the configuration, so changing an extra after
 * saving shows the new combination as not saved yet.
 */
const props = defineProps<{
  selection: WishlistConfiguration | undefined;
  name: string;
}>();

const { find, add, remove } = useWishlistEntries();
const { trackAddToWishlist } = useTrackEvent();

const saved = computed(() =>
  props.selection ? find(props.selection) : undefined,
);
const busy = ref(false);
const failed = ref(false);

async function toggle() {
  if (!props.selection || busy.value) return;
  busy.value = true;
  failed.value = false;
  try {
    if (saved.value) {
      await remove(saved.value.id);
    } else {
      await add(props.selection);
      trackAddToWishlist({ productNumber: props.selection.productNumber });
    }
  } catch (error) {
    console.error("[wishlist][toggle]", error);
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <SbIconButton
    :label="`${name} merken`"
    :pressed="!!saved"
    :disabled="!selection"
    :aria-busy="busy || undefined"
    @click="toggle"
  >
    <SbIcon name="heart" :filled="!!saved" />
  </SbIconButton>
  <span class="sr-only" role="status">{{
    failed ? "Merken hat nicht geklappt. Bitte versuchen Sie es erneut." : ""
  }}</span>
</template>
