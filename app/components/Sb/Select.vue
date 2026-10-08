<script setup lang="ts" generic="T extends string">
/**
 * Native select with a visible label (#445), e.g. the sorting of the menu
 * and the search. The browser's own picker is the most accessible one on
 * phones; only the closed control is styled.
 */
defineProps<{
  label: string;
  options: { value: T; label: string }[];
  /** shown while no option is selected */
  placeholder?: string;
}>();

const model = defineModel<T>();
const id = useId();
</script>

<template>
  <div class="flex items-center gap-3 font-body text-sb-ink">
    <label :for="id" class="shrink-0 text-sm font-bold">{{ label }}</label>
    <div class="relative min-w-0 flex-1">
      <select
        :id="id"
        v-model="model"
        class="min-h-11 w-full appearance-none rounded-sb-control border-[1.5px] border-sb-control bg-sb-surface ps-3.5 pe-10 text-base text-sb-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus"
      >
        <option
          v-if="placeholder && !options.some((o) => o.value === model)"
          :value="model"
          disabled
        >
          {{ placeholder }}
        </option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sb-ink-muted"
      >
        <SbIcon name="chevron-down" />
      </span>
    </div>
  </div>
</template>
