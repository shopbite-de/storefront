<script setup lang="ts">
import type { Schemas } from "#shopware";

/** One property group of the menu filter (#445), as a checkbox list. */
const props = defineProps<{
  filter: Schemas["PropertyGroup"];
  modelValue: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

function toggle(id: string, checked: boolean) {
  const next = props.modelValue.filter((value) => value !== id);
  if (checked) next.push(id);
  emit("update:modelValue", next);
}
</script>

<template>
  <fieldset class="flex flex-col font-body text-sb-ink">
    <legend class="mb-1 font-bold">
      {{ filter.translated?.name ?? filter.name }}
    </legend>
    <SbCheckbox
      v-for="option in filter.options ?? []"
      :key="option.id"
      :model-value="modelValue.includes(option.id)"
      :label="option.translated?.name ?? option.name ?? ''"
      @update:model-value="(checked: boolean) => toggle(option.id, checked)"
    />
  </fieldset>
</template>
