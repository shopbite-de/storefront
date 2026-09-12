<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const emit = defineEmits<{
  "ingredients-deselected": [deselected: string[]];
}>();

const deselected = ref<string[]>([]);

const ingredients = computed<string[]>(() =>
  ((props.product.properties ?? []) as Schemas["PropertyGroupOption"][])
    .filter((option) => option.group?.name === "Hauptzutaten")
    .map((option) => option.translated.name),
);

function toggle(ingredient: string) {
  deselected.value = deselected.value.includes(ingredient)
    ? deselected.value.filter((name) => name !== ingredient)
    : [...deselected.value, ingredient];
}

watch(deselected, () => emit("ingredients-deselected", deselected.value));
</script>

<template>
  <div v-if="ingredients.length > 0" class="flex flex-col gap-2">
    <span class="font-semibold text-highlighted">Ohne</span>
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
        :icon="deselected.includes(ingredient) ? 'i-lucide-x' : undefined"
        :aria-pressed="deselected.includes(ingredient)"
        :label="ingredient"
        @click="toggle(ingredient)"
      />
    </div>
  </div>
</template>
