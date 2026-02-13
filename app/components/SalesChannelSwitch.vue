<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { apiClient } = useShopwareContext();

const config = useRuntimeConfig();

const isMultiChannel = computed(
  () => !!config.public.shopBite.feature.multiChannel,
);

const storeUrl = computed(() => config.public.storeUrl);

const { data: salesChannels, pending: status } = useAsyncData(
  "multi-channel-group",
  async () => {
    const response = await apiClient.invoke(
      "shopbite.multi-channel-group.get get /shopbite/multi-channel-group",
    );

    return response.data;
  },
  {
    transform: (response: Schemas["MultiChannelGroupStruct"]) =>
      transform(response),
  },
);

function transform(
  multiChannelGroups: Schemas["MultiChannelGroupStruct"],
): SelectMenuItem[] {
  const group = multiChannelGroups.multiChannelGroup?.[0];
  if (!group) return [];

  const storeUrlValue = storeUrl.value;

  const getBestDomainUrl = (
    domains: Schemas["Domain"][] | undefined,
    preferredUrl: string | null | undefined,
  ): string => {
    const safeDomains = domains ?? [];
    const matchingDomain =
      preferredUrl != null
        ? safeDomains.find((domain) => domain?.url === preferredUrl)
        : undefined;
    const fallbackDomain = safeDomains.find((domain) => Boolean(domain?.url));
    return matchingDomain?.url ?? fallbackDomain?.url ?? "";
  };

  const salesChannels = group.salesChannels ?? [];
  return salesChannels.map((channel) => ({
    label: channel.name,
    value: getBestDomainUrl(channel.domains, storeUrlValue),
  }));
}

const selectedStore = ref<SelectMenuItem>();

watchEffect(() => {
  const scValue = (salesChannels as any)?.value as
    | SelectMenuItem[]
    | undefined;
  if (Array.isArray(scValue) && storeUrl.value && !selectedStore.value) {
    const matchingChannel = scValue.find(
      (channel) => channel?.value === storeUrl.value,
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
    :loading="status"
    icon="i-lucide-store"
  />
</template>
