<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

/**
 * Square icon button, 44 × 44 px (#440). `label` is required: it is the
 * accessible name, icon-only controls have no visible text.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    variant?: "primary" | "tint" | "surface" | "ghost";
    to?: RouteLocationRaw;
    type?: "button" | "submit";
    disabled?: boolean;
    pressed?: boolean;
  }>(),
  {
    variant: "surface",
    to: undefined,
    type: "button",
    disabled: false,
    pressed: undefined,
  },
);

const VARIANTS = {
  primary: "bg-sb-primary text-sb-on-primary hover:bg-sb-primary-hover",
  tint: "bg-sb-primary-tint text-sb-primary-ink hover:brightness-95",
  surface: "bg-sb-muted text-sb-ink hover:brightness-95",
  ghost: "bg-transparent text-sb-ink hover:bg-sb-muted",
} as const;

const classes = computed(() => [
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-sb-control font-body text-[15px] font-bold transition-colors",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus",
  "disabled:cursor-not-allowed disabled:opacity-60",
  VARIANTS[props.variant],
]);
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :aria-label="label">
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :aria-label="label"
    :aria-pressed="pressed"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
