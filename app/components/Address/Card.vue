<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    address?: Schemas["CustomerAddress"] | null;
    title?: string;
  }>(),
  {
    address: null,
    title: "",
  },
);

const { address, title } = toRefs(props);
</script>

<template>
  <section
    v-if="address"
    class="flex flex-col gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5 font-body text-sb-ink"
  >
    <h2 v-if="title" class="font-display text-xl">{{ title }}</h2>
    <AddressDetail :address="address" />
    <slot />
  </section>
</template>
