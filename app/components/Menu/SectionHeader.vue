<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Title of a menu category in the presets (#441): name in the display
 * font, dish count, the category description as a note. Replaces the photo
 * banner, which made the menu look like a delivery platform.
 */
const props = defineProps<{
  category: Schemas["Category"];
  count: number;
}>();

const name = computed(
  () => props.category.translated?.name ?? props.category.name ?? "",
);
const description = computed(
  () => props.category.translated?.description ?? props.category.description,
);
</script>

<template>
  <header class="mt-6 mb-5 flex flex-col gap-3 md:mt-10">
    <h1
      class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 border-b-[1.5px] border-sb-ink pb-3"
    >
      <span class="font-display text-4xl leading-none md:text-5xl">{{
        name
      }}</span>
      <span class="font-body text-sm font-medium text-sb-ink-muted"
        >{{ count }} {{ count === 1 ? "Gericht" : "Gerichte" }}</span
      >
    </h1>
    <p v-if="description" class="font-body text-[15px] text-sb-ink">
      {{ description }}
    </p>
  </header>
</template>
