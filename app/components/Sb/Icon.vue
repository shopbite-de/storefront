<script setup lang="ts">
/**
 * The few stroke icons the base components need (#440), inline so they
 * render in the SSR HTML without an icon request. Decorative only: the
 * control that holds the icon carries the accessible name.
 */
type IconName =
  | "plus"
  | "minus"
  | "trash"
  | "check"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "search"
  | "phone"
  | "heart";

withDefaults(
  defineProps<{ name: IconName; size?: number; filled?: boolean }>(),
  { size: 18, filled: false },
);

const PATHS: Record<IconName, string[]> = {
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  check: ["m5 12 5 5L20 7"],
  "chevron-right": ["m9 6 6 6-6 6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"],
  heart: [
    "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
  ],
  phone: [
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
  ],
};
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <path v-for="d in PATHS[name]" :key="d" :d="d" />
  </svg>
</template>
