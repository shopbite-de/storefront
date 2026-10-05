<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    sortedProperties: Schemas["PropertyGroup"][] | undefined;
    // `chip` sits in the ingredient row, `overlay` on the cover image (#325).
    variant?: "chip" | "overlay";
  }>(),
  { variant: "chip" },
);

const badges = computed(() => {
  const diets = getDiets(props.sortedProperties);
  return [
    {
      label: "Vegetarisch",
      icon: "i-lucide-leaf",
      show: diets.includes("vegetarian"),
    },
    { label: "Vegan", icon: "i-lucide-vegan", show: diets.includes("vegan") },
  ].filter((badge) => badge.show);
});

// Static spans with the UBadge classes, see CardIngredients.vue.
const badgeClass = computed(() =>
  props.variant === "overlay"
    ? "rounded-md bg-default ring ring-inset ring-success/50"
    : "rounded-full bg-success/10",
);
</script>

<template>
  <span
    v-for="badge in badges"
    :key="badge.label"
    class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-success"
    :class="badgeClass"
  >
    <UIcon :name="badge.icon" class="size-4 shrink-0" />
    {{ badge.label }}
  </span>
</template>
