<script setup lang="ts" generic="T extends string">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from "reka-ui";

/**
 * Single choice from a list, as rows or as cards (#440): variants and
 * required options in the product sheet, delivery or pickup and payment in
 * the checkout. A radio group with a visible legend.
 */
withDefaults(
  defineProps<{
    legend: string;
    options: {
      value: T;
      label: string;
      description?: string;
      /** e.g. "inklusive", "+2,00 €" */
      trailing?: string;
      disabled?: boolean;
    }[];
    variant?: "rows" | "cards";
    required?: boolean;
    /** visually hide the legend when a heading already names the group */
    hideLegend?: boolean;
  }>(),
  { variant: "rows", required: false, hideLegend: false },
);

const model = defineModel<T>();
const legendId = useId();
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    :aria-labelledby="legendId"
    :required="required"
    :class="
      variant === 'cards' ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col gap-2'
    "
  >
    <span
      :id="legendId"
      :class="
        hideLegend
          ? 'sr-only'
          : 'col-span-full flex items-center justify-between font-body text-base font-bold text-sb-ink'
      "
    >
      {{ legend }}
      <span
        v-if="required"
        class="rounded-full bg-sb-primary px-2.5 py-0.5 text-xs font-bold text-sb-on-primary"
        >Pflicht</span
      >
    </span>
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
      class="group flex min-h-13 items-center gap-3 rounded-sb-control border-[1.5px] border-sb-control bg-sb-surface px-4 py-3 text-left font-body text-[15px] text-sb-ink transition-colors hover:bg-sb-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus disabled:opacity-60 data-[state=checked]:border-2 data-[state=checked]:border-sb-primary data-[state=checked]:bg-sb-primary-tint"
    >
      <span
        class="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-sb-control bg-sb-surface group-data-[state=checked]:border-sb-primary"
        aria-hidden="true"
      >
        <RadioGroupIndicator class="size-2.5 rounded-full bg-sb-primary" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="font-semibold">{{ option.label }}</span>
        <span v-if="option.description" class="text-sm text-sb-ink-muted">{{
          option.description
        }}</span>
      </span>
      <span
        v-if="option.trailing"
        class="text-sm text-sb-ink-muted tabular-nums"
        >{{ option.trailing }}</span
      >
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
