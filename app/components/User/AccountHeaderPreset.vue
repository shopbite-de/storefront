<script setup lang="ts">
/** Heading of the account pages in the presets (#445). */
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <header class="mb-6 flex flex-col gap-2 font-body">
    <p class="text-sm font-bold tracking-wide text-sb-accent uppercase">
      Kundenkonto
    </p>
    <h1 class="font-display text-4xl leading-tight text-sb-ink sm:text-5xl">
      {{ title }}
    </h1>
    <p v-if="description" class="text-sb-ink-muted">{{ description }}</p>
  </header>
</template>
