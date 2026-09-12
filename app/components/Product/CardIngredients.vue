<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  sortedProperties: Schemas["PropertyGroup"][] | undefined;
  withDietBadges: boolean;
}>();

const mainIngredients = computed(() =>
  getMainIngredients(props.sortedProperties),
);
</script>

<template>
  <!-- Plain spans with the UBadge "soft" classes: a listing hydrates up to
       ten cards with several chips each, and every UBadge instance costs a
       tailwind-variants merge (#325). -->
  <div
    v-if="withDietBadges || mainIngredients.length > 0"
    class="flex flex-wrap gap-1.5"
  >
    <ProductCardDietBadges
      v-if="withDietBadges"
      :sorted-properties="sortedProperties"
      variant="chip"
    />
    <span
      v-for="ingredient in mainIngredients"
      :key="ingredient.id"
      class="inline-flex items-center rounded-full bg-elevated px-2 py-1 text-xs font-medium text-default"
    >
      {{ ingredient.translated.name }}
    </span>
  </div>
</template>
