<script setup lang="ts">
/**
 * Store status, e.g. "Geöffnet bis 23:00" (#440). The text carries the
 * meaning; the dot only repeats it.
 */
withDefaults(
  defineProps<{
    tone?: "open" | "closed" | "neutral";
  }>(),
  { tone: "neutral" },
);
</script>

<template>
  <span
    :class="[
      'inline-flex min-h-8 items-center gap-2 rounded-sb-control px-3 font-body text-sm font-bold',
      tone === 'open'
        ? 'bg-sb-primary-tint text-sb-primary-ink'
        : tone === 'closed'
          ? 'bg-sb-muted text-sb-ink'
          : 'bg-sb-muted text-sb-ink-muted',
    ]"
  >
    <span
      aria-hidden="true"
      :class="[
        'size-2 rounded-full',
        tone === 'open'
          ? 'bg-sb-primary'
          : tone === 'closed'
            ? 'bg-sb-danger'
            : 'bg-sb-ink-muted',
      ]"
    />
    <slot />
  </span>
</template>
