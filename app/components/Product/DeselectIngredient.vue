<script setup lang="ts">
import type { Ingredient } from "../../../shared/domain";

/** The main ingredients as chips; a released chip removes it ("ohne"). */
const props = defineProps<{
  ingredients: readonly Ingredient[];
  // Ingredient names deselected via the dish sheet URL (#411).
  initialDeselected?: string[];
}>();

const emit = defineEmits<{
  "ingredients-deselected": [deselected: string[]];
}>();

const names = computed<string[]>(() =>
  props.ingredients.map((ingredient) => ingredient.name),
);

// Names that are no ingredient of the dish (renamed, typo) are ignored.
const deselected = ref<string[]>(
  names.value.filter((name) => props.initialDeselected?.includes(name)),
);

const labelId = useId();

// SbChip is pressed while the ingredient is included.
function setIncluded(ingredient: string, included: boolean) {
  if (included === !deselected.value.includes(ingredient)) return;
  toggle(ingredient);
}

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
  <div v-if="names.length > 0" class="flex flex-col gap-2.5">
    <div class="flex items-baseline justify-between gap-3">
      <span :id="labelId" class="font-body font-bold text-sb-ink">Zutaten</span>
      <span class="text-[13px] text-sb-ink-muted">Antippen zum Weglassen</span>
    </div>
    <div class="flex flex-wrap gap-2" role="group" :aria-labelledby="labelId">
      <SbChip
        v-for="ingredient in names"
        :key="ingredient"
        :label="ingredient"
        variant="ingredient"
        :model-value="!deselected.includes(ingredient)"
        @update:model-value="setIncluded(ingredient, $event)"
      />
    </div>
  </div>
</template>
