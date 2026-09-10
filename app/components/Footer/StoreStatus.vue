<script setup lang="ts">
// Open/closed line above the opening hours. Replaces the status toasts,
// whose focus proxies Lighthouse flagged on every page (#275). Rendered on
// the client only, see useStoreStatus.
const { status } = useStoreStatus();

const text = computed(() => {
  if (!status.value) return "";
  if (status.value.open) return `Geöffnet bis ${status.value.closesAt} Uhr`;
  return status.value.nextOpening
    ? `Geschlossen, wir öffnen wieder ${status.value.nextOpening}`
    : "Geschlossen";
});
</script>

<template>
  <ClientOnly>
    <p v-if="status" role="status" class="flex items-center gap-2 text-sm">
      <span
        class="size-2 shrink-0 rounded-full"
        :class="status.open ? 'bg-success' : 'bg-dimmed'"
        aria-hidden="true"
      />
      <span class="text-default">{{ text }}</span>
    </p>
    <template #fallback>
      <p class="h-5" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
