<script setup lang="ts">
import type { CustomerAddress } from "~/types/commerce/user";

const props = withDefaults(
  defineProps<{
    address?: CustomerAddress | null;
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
