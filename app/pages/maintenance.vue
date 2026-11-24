<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: t("common.maintenance.title"),
});
</script>

<template>
  <div
    class="flex min-h-[60vh] items-center justify-center p-6 font-body text-sb-ink"
  >
    <div class="flex max-w-xl flex-col gap-3 text-center">
      <h1 class="font-display text-4xl leading-tight">
        {{ $t("common.maintenance.heading") }}
      </h1>
      <p class="text-lg text-sb-ink-muted">
        {{ $t("common.maintenance.text") }}
      </p>
    </div>
  </div>
</template>
