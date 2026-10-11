<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Explains the allergen and additive codes on the cards of the list
 * (#485). Native <details>, so the legend is in the SSR HTML.
 */
const props = defineProps<{ products: Schemas["Product"][] }>();

const legend = computed(() => foodLabelLegend(props.products));
</script>

<template>
  <details
    v-if="legend.length"
    class="mt-6 rounded-sb-card bg-sb-surface px-4 py-3 text-sm text-sb-ink"
  >
    <summary class="min-h-11 cursor-pointer py-2.5 font-semibold">
      Allergene und Zusatzstoffe
    </summary>
    <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 pb-2">
      <template v-for="entry in legend" :key="entry.code">
        <dt class="font-semibold tabular-nums">{{ entry.code }}</dt>
        <dd class="text-sb-ink-muted">{{ entry.name }}</dd>
      </template>
    </dl>
  </details>
</template>
