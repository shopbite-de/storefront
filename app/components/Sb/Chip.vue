<script setup lang="ts">
/**
 * Toggle chip (#440). `filter`: a listing filter, filled when on.
 * `ingredient`: an ingredient that is on by default; switched off it reads
 * "ohne <name>" and is struck through, so the state is not colour only.
 * Its accessible name stays the ingredient (pressed = included), a name
 * that changes with the state would read as a double negative.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    variant?: "filter" | "ingredient";
  }>(),
  { variant: "filter" },
);

const pressed = defineModel<boolean>({ default: false });

const text = computed(() =>
  props.variant === "ingredient" && !pressed.value
    ? `ohne ${props.label}`
    : props.label,
);
</script>

<template>
  <button
    type="button"
    :aria-pressed="pressed"
    :aria-label="variant === 'ingredient' ? label : undefined"
    :class="[
      'inline-flex min-h-11 items-center gap-2 rounded-sb-control border-[1.5px] px-3.5 font-body text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus',
      variant === 'filter'
        ? pressed
          ? 'border-sb-ink bg-sb-ink text-sb-surface'
          : 'border-sb-control bg-sb-surface text-sb-ink hover:bg-sb-muted'
        : pressed
          ? 'border-sb-control bg-sb-surface text-sb-ink hover:bg-sb-muted'
          : 'border-dashed border-sb-control bg-transparent text-sb-ink-muted line-through',
    ]"
    @click="pressed = !pressed"
  >
    {{ text }}
    <SbIcon
      v-if="variant === 'ingredient' && pressed"
      name="close"
      :size="14"
      class="text-sb-ink-muted"
    />
  </button>
</template>
