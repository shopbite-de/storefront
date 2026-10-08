<script setup lang="ts">
import type { Schemas } from "#shopware";

type StoreSelectItem = { label: string; value: string };

const { apiClient } = useShopwareContext();

const config = useRuntimeConfig();

const isMultiChannel = useRuntimeConfig().public.shopBite.feature.multiChannel;

const storeUrl = computed(() => config.public.storeUrl);

const { data: salesChannels } = useAsyncData(
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
): StoreSelectItem[] {
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
    label: channel.name ?? "",
    value: getBestDomainUrl(channel.domains, storeUrlValue),
  }));
}

// The shop of this storefront; picking another one opens its domain.
const selectedUrl = computed({
  get: () => storeUrl.value,
  set: (url: string) => {
    if (url && url !== storeUrl.value) window.location.href = url;
  },
});
</script>

<template>
  <SbSelect
    v-if="isMultiChannel && salesChannels?.length"
    v-model="selectedUrl"
    label="Filiale"
    :options="salesChannels"
  />
</template>
