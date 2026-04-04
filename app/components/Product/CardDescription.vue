<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  description: string | null | undefined;
  sortedProperties: Schemas["PropertyGroup"][] | undefined;
}>();

const mainIngredients = computed<Schemas["PropertyGroupOption"][]>(() => {
  const group = props.sortedProperties?.find(
    (propertyGroup) => propertyGroup.translated.name === "Hauptzutaten",
  );
  return group?.options ?? [];
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <div>{{ description }}</div>
    <div
      v-if="mainIngredients.length > 0"
      class="font-extralight text-sm text-pretty"
    >
      {{ mainIngredients.map((i) => i.translated.name).join(", ") }}
    </div>
  </div>
</template>
