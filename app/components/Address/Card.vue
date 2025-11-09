<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    address?: Schemas["CustomerAddress"] | null;
    title?: string;
    icon?: string;
  }>(),
  {
    address: null,
    title: "",
    icon: "",
  },
);

const { address, title, icon } = toRefs(props);
</script>

<template>
  <UPageCard
    v-if="address"
    :icon="icon"
    :title="title"
    :ui="{
      root: 'shadow-md rounded-md ',
      footer: 'w-full',
    }"
  >
    <AddressDetail :address="address" />
  </UPageCard>
</template>
