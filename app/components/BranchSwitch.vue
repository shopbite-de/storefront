<script setup lang="ts">
import type { Branch } from "../../shared/domain";

/**
 * Switch between the branches of the restaurant ("Filiale",
 * `/api/shop/branches`); picking another one opens its storefront.
 */
const config = useRuntimeConfig();
const isMultiChannel = config.public.shopBite.feature.multiChannel;
const storeUrl = computed(() => config.public.storeUrl);

const { data: branches } = useAsyncData(
  "shop-branches",
  () => $fetch<readonly Branch[]>("/api/shop/branches"),
  { default: () => [] as readonly Branch[] },
);

const options = computed(() =>
  (branches.value ?? []).map((branch) => ({
    label: branch.name,
    value: branch.url,
  })),
);

const selectedUrl = computed({
  get: () => storeUrl.value,
  set: (url: string) => {
    if (url && url !== storeUrl.value) window.location.href = url;
  },
});
</script>

<template>
  <SbSelect
    v-if="isMultiChannel && options.length"
    v-model="selectedUrl"
    label="Filiale"
    :options="options"
  />
</template>
