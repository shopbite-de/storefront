<script setup lang="ts">
/**
 * Frame of the login, registration and password pages in the presets
 * (#445): page heading, an optional intro and the form on a card.
 */
withDefaults(
  defineProps<{
    title: string;
    kicker?: string;
    wide?: boolean;
  }>(),
  { kicker: "Kundenkonto", wide: false },
);
</script>

<template>
  <div
    :class="[
      'mx-auto flex w-full flex-col gap-6 px-4 pt-8 pb-16 font-body text-sb-ink sm:pt-12',
      wide ? 'max-w-2xl' : 'max-w-md',
    ]"
  >
    <header class="flex flex-col gap-2">
      <p class="text-sm font-bold tracking-wide text-sb-accent uppercase">
        {{ kicker }}
      </p>
      <h1 class="font-display text-4xl leading-tight sm:text-5xl">
        {{ title }}
      </h1>
      <div v-if="$slots.intro" class="flex flex-col gap-2 text-sb-ink-muted">
        <slot name="intro" />
      </div>
    </header>
    <div class="rounded-sb-card border border-sb-line bg-sb-surface p-6">
      <slot />
    </div>
    <div v-if="$slots.footer" class="text-sm text-sb-ink-muted">
      <slot name="footer" />
    </div>
  </div>
</template>
