<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  sortedProperties: Schemas["PropertyGroup"][] | undefined;
}>();

const isVegi = computed<boolean>(
  () =>
    props.sortedProperties?.some(
      (group) =>
        group.translated.name === "Vegetarisch" &&
        group.options?.some((option) => option.translated.name === "Ja"),
    ) ?? false,
);

const isVegan = computed<boolean>(
  () =>
    props.sortedProperties?.some(
      (group) =>
        group.translated.name === "Vegan" &&
        group.options?.some((option) => option.translated.name === "Ja"),
    ) ?? false,
);
</script>

<template>
  <LazyUBadge
    v-if="isVegi"
    icon="i-lucide-leaf"
    color="success"
    variant="outline"
    label="Vegetarisch"
  />
  <LazyUBadge
    v-if="isVegan"
    icon="i-lucide-vegan"
    color="success"
    variant="outline"
    label="Vegan"
  />
</template>
