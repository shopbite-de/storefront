<script setup lang="ts">
/**
 * Rating stars (#444), e.g. 4,5 as four full and one half star. A graphic
 * only: the rating always stands next to it in words, so the stars are
 * hidden from assistive technology.
 */
const props = withDefaults(
  defineProps<{
    /** 0 to 5, half steps are drawn half filled */
    value: number;
    size?: number;
  }>(),
  { size: 14 },
);

const STAR =
  "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";

const stars = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const fill = Math.min(Math.max(props.value - index, 0), 1);
    // round to whole and half stars
    return fill >= 0.75 ? 1 : fill >= 0.25 ? 0.5 : 0;
  }),
);

const clipId = useId();
</script>

<template>
  <span class="inline-flex gap-0.5 text-sb-star" aria-hidden="true">
    <svg
      v-for="(fill, index) in stars"
      :key="index"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      focusable="false"
    >
      <defs v-if="fill === 0.5">
        <clipPath :id="`${clipId}-${index}`">
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      <path
        :d="STAR"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <path
        v-if="fill > 0"
        :d="STAR"
        fill="currentColor"
        :clip-path="fill === 0.5 ? `url(#${clipId}-${index})` : undefined"
      />
    </svg>
  </span>
</template>
