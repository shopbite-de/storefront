<script setup lang="ts">
useSeoMeta({
  title: "Wartungsmodus",
});

const { hasPreset } = useThemePreset();
</script>

<template>
  <div
    v-if="hasPreset"
    class="flex min-h-[60vh] items-center justify-center p-6 font-body text-sb-ink"
  >
    <div class="flex max-w-xl flex-col gap-3 text-center">
      <h1 class="font-display text-4xl leading-tight">Gleich wieder da</h1>
      <p class="text-lg text-sb-ink-muted">
        Der Shop ist vorübergehend nicht erreichbar. Bitte versuchen Sie es in
        ein paar Minuten noch einmal.
      </p>
    </div>
  </div>
  <div
    v-else
    class="min-h-screen flex items-center justify-center p-6 text-center"
  >
    <div>
      <h1 class="text-3xl font-semibold mb-3">Wartungsmodus</h1>
      <p class="text-gray-600">
        Der Shop ist vorübergehend nicht verfügbar. Bitte versuchen Sie es
        später erneut.
      </p>
    </div>
  </div>
</template>
