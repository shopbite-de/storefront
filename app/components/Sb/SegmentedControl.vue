<script setup lang="ts" generic="T extends string">
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";

/**
 * Two to four mutually exclusive options side by side, e.g. Lieferung /
 * Abholung (#440). A radio group for assistive technology (arrow keys move
 * the selection), segments for the eye.
 */
defineProps<{
  options: { value: T; label: string }[];
  /** accessible name of the group */
  label: string;
}>();

const model = defineModel<T>({ required: true });
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    :aria-label="label"
    orientation="horizontal"
    class="grid auto-cols-fr grid-flow-col gap-1 rounded-sb-control bg-sb-muted p-1"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      class="min-h-10 rounded-[calc(var(--sb-radius-control)-3px)] px-4 font-body text-sm font-semibold text-sb-ink-muted transition-colors hover:text-sb-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus data-[state=checked]:bg-sb-ink data-[state=checked]:font-bold data-[state=checked]:text-sb-surface"
    >
      {{ option.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
