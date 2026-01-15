<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const config = useRuntimeConfig();
const isMultiChannel = computed(
  () => !!config.public.shopBite.feature.multiChannel,
);
const storeUrl = computed(() => config.public.storeUrl);

const { data: salesChannels, status } = await useFetch(
  "/api/shopware/sales-channels",
  {
    key: "sales-channels",
    transform: (data: Schemas["SalesChannel"][]) => {
      const currentUrl = storeUrl.value;
      return data?.map((channel) => {
        const domains = channel.domains || [];
        const matchingDomain =
          currentUrl != null
            ? domains.find((domain) => domain?.url === currentUrl)
            : undefined;
        const fallbackDomain = domains.find((domain) => !!domain?.url);
        const domainUrl = matchingDomain?.url ?? fallbackDomain?.url ?? "";
        return {
          label: channel.translated.name ?? channel.name,
          value: domainUrl,
        };
      });
    },
    lazy: true,
  },
);

const selectedStore = ref<SelectMenuItem>();

watchEffect(() => {
  if (salesChannels.value && storeUrl.value && !selectedStore.value) {
    const matchingChannel = salesChannels.value.find(
      (channel) => channel.value === storeUrl.value,
    );
    if (matchingChannel) {
      selectedStore.value = matchingChannel;
    }
  }
});

watch(selectedStore, (newStore, oldStore) => {
  if (newStore && oldStore && newStore.value !== oldStore.value) {
    window.location.href = newStore.value;
  }
});
</script>

<template>
  <USelectMenu
    v-if="isMultiChannel"
    v-model="selectedStore"
    :items="salesChannels"
    :loading="status === 'pending'"
    icon="i-lucide-store"
  />
</template>
