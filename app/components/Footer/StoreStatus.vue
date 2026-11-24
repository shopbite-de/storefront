<script setup lang="ts">
// Open/closed line above the opening hours. Replaces the status toasts,
// whose focus proxies Lighthouse flagged on every page (#275). Rendered on
// the client only, see useStoreStatus.
const { status } = useStoreStatus();
const { t } = useI18n();

const text = computed(() => {
  if (!status.value) return "";
  if (status.value.open)
    return t("common.storeStatus.footer.open", {
      time: status.value.closesAt,
    });
  return status.value.nextOpening
    ? t("common.storeStatus.footer.opens", {
        when: status.value.nextOpening,
      })
    : t("common.storeStatus.closed");
});
</script>

<template>
  <ClientOnly>
    <p v-if="status" role="status" class="flex items-center gap-2 text-sm">
      <span
        class="size-2 shrink-0 rounded-full"
        :class="status.open ? 'bg-sb-primary' : 'bg-sb-danger'"
        aria-hidden="true"
      />
      <span class="text-sb-ink">{{ text }}</span>
    </p>
    <template #fallback>
      <p class="h-5" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
