<script setup lang="ts">
import type { WishlistSelection } from "~/utils/wishlist";

/**
 * Saves the dish as configured right now (#467): variant, deselected
 * ingredients and extras. A toggle with `aria-pressed` and a stable name;
 * the pressed state follows the configuration, so changing an extra after
 * saving shows the new combination as not saved yet.
 */
const props = defineProps<{
  selection: WishlistSelection | undefined;
  name: string;
}>();

const { find, add, remove } = useWishlistEntries();
const { trackAddToWishlist } = useTrackEvent();

const saved = computed(() =>
  props.selection ? find(props.selection.configuration) : undefined,
);
const busy = ref(false);
const failed = ref<"full" | "error" | null>(null);

async function toggle() {
  if (!props.selection || busy.value) return;
  busy.value = true;
  failed.value = null;
  try {
    if (saved.value) {
      await remove(saved.value.id);
    } else {
      await add(props.selection);
      trackAddToWishlist({ productNumber: props.selection.dishNumber });
    }
  } catch (error) {
    if (error instanceof WishlistFullError) {
      failed.value = "full";
      return;
    }
    console.error("[wishlist][toggle]", domainErrorCode(error) ?? "no answer");
    failed.value = "error";
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
    failed === "full"
      ? `Ihre Merkliste ist voll (${WISHLIST_LIMIT} Gerichte). Bitte entfernen Sie zuerst ein Gericht.`
      : failed
        ? "Merken hat nicht geklappt. Bitte versuchen Sie es erneut."
        : ""
  }}</span>
</template>
