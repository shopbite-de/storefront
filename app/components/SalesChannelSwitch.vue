<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

type StoreSelectItem = SelectMenuItem & { value: string };

type SalesChannelDomain = { url?: string };
type SalesChannel = { name: string; domains?: SalesChannelDomain[] };
type MultiChannelGroupStruct = {
  multiChannelGroup?: Array<{ salesChannels?: SalesChannel[] }>;
};

const config = useRuntimeConfig();

const isMultiChannel = useRuntimeConfig().public.shopBite.feature.multiChannel;

const storeUrl = computed(() => config.public.storeUrl);

const { data: salesChannels, pending: status } = useAsyncData(
  "multi-channel-group",
  () => $fetch<MultiChannelGroupStruct>("/api/shopbite/multi-channel-group"),
  {
    transform: (response: MultiChannelGroupStruct) => transform(response),
  },
);

function transform(
  multiChannelGroups: MultiChannelGroupStruct,
): StoreSelectItem[] {
  const group = multiChannelGroups.multiChannelGroup?.[0];
  if (!group) return [];

  const storeUrlValue = storeUrl.value;

  const getBestDomainUrl = (
    domains: SalesChannelDomain[] | undefined,
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

const selectedStore = ref<StoreSelectItem>();

watchEffect(() => {
  const scValue = salesChannels?.value as StoreSelectItem[] | undefined;
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
  <LazyUSelectMenu
    v-if="isMultiChannel"
    v-model="selectedStore"
    :items="salesChannels"
    :loading="status"
    icon="i-lucide-store"
  />
</template>
