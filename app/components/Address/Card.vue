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
const { hasPreset } = useThemePreset();
</script>

<template>
  <section
    v-if="address && hasPreset"
    class="flex flex-col gap-3 rounded-sb-card border border-sb-line bg-sb-surface p-5 font-body text-sb-ink"
  >
    <h2 v-if="title" class="font-display text-xl">{{ title }}</h2>
    <AddressDetail :address="address" />
    <slot />
  </section>
  <UPageCard
    v-else-if="address"
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
