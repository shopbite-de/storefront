<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
  // Ingredient names deselected via the quick view URL (#411).
  initialDeselected?: string[];
}>();

const emit = defineEmits<{
  "ingredients-deselected": [deselected: string[]];
}>();

const ingredients = computed<string[]>(() =>
  ((props.product.properties ?? []) as Schemas["PropertyGroupOption"][])
    .filter((option) => option.group?.name === "Hauptzutaten")
    .map((option) => option.translated.name),
);

// Names that are no ingredient of the product (renamed, typo) are ignored.
const deselected = ref<string[]>(
  ingredients.value.filter((name) => props.initialDeselected?.includes(name)),
);

function toggle(ingredient: string) {
  deselected.value = deselected.value.includes(ingredient)
    ? deselected.value.filter((name) => name !== ingredient)
    : [...deselected.value, ingredient];
}

watch(deselected, () => emit("ingredients-deselected", deselected.value), {
  immediate: deselected.value.length > 0,
});
</script>

<template>
  <div v-if="ingredients.length > 0" class="flex flex-col gap-2">
    <!-- The quick view lists the ingredients only here (no chip row above
         repeating them): tapping one removes it from the order. Both states
         carry an icon of the same size, so toggling a chip keeps its width
         and never rewraps the row (the drawer grew on phones). -->
    <div class="flex items-baseline justify-between">
      <span class="font-semibold text-highlighted">Zutaten</span>
      <span class="text-xs text-muted">antippen zum Entfernen</span>
    </div>
    <div
      class="flex flex-wrap gap-2"
      role="group"
      aria-label="Zutaten abwählen"
    >
      <UButton
        v-for="ingredient in ingredients"
        :key="ingredient"
        size="lg"
        class="rounded-full"
        :class="{ 'line-through': deselected.includes(ingredient) }"
        :color="deselected.includes(ingredient) ? 'error' : 'neutral'"
        :variant="deselected.includes(ingredient) ? 'subtle' : 'outline'"
        :icon="deselected.includes(ingredient) ? 'i-lucide-plus' : 'i-lucide-x'"
        :aria-pressed="deselected.includes(ingredient)"
        :label="ingredient"
        @click="toggle(ingredient)"
      />
    </div>
  </div>
</template>
