<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

/**
 * Base button (#440). Renders a NuxtLink when `to` is set, otherwise a
 * <button>. Styled only through the preset tokens; minimum height 44 px.
 */
const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "tint" | "ghost";
    size?: "md" | "lg";
    to?: RouteLocationRaw;
    type?: "button" | "submit" | "reset";
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    variant: "primary",
    size: "md",
    to: undefined,
    type: "button",
    block: false,
    disabled: false,
    loading: false,
  },
);

const VARIANTS = {
  primary:
    "bg-sb-primary text-sb-on-primary hover:bg-sb-primary-hover border-transparent",
  secondary: "bg-sb-surface text-sb-ink border-sb-control hover:bg-sb-muted",
  tint: "bg-sb-primary-tint text-sb-primary-ink border-transparent hover:brightness-95",
  ghost:
    "bg-transparent text-sb-primary-ink border-transparent hover:bg-sb-muted",
} as const;

const classes = computed(() => [
  "inline-flex items-center justify-center gap-2 rounded-sb-control border-[1.5px] font-body font-bold whitespace-nowrap transition-colors",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus",
  "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
  props.size === "lg" ? "min-h-13 px-6 text-base" : "min-h-11 px-4 text-[15px]",
  props.block ? "w-full" : "",
  VARIANTS[props.variant],
]);
</script>

<template>
  <NuxtLink
    v-if="to && !disabled"
    :to="to"
    :class="classes"
    :aria-busy="loading || undefined"
  >
    <slot name="leading" />
    <slot />
    <slot name="trailing" />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <slot name="leading" />
    <slot />
    <slot name="trailing" />
  </button>
</template>
