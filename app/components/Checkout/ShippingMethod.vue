<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  shippingMethod: Schemas["ShippingMethod"] | null;
}>();

const { shippingMethod } = toRefs(props);
</script>

<template>
  <div
    v-if="shippingMethod !== null"
    class="flex flex-row gap-8 p-6 border rounded-lg border-primary"
  >
    <NuxtImg
      v-if="shippingMethod.media?.url"
      :src="shippingMethod.media.url"
      width="50"
    />
    <div>
      <h3 class="text-base text-pretty font-semibold text-highlighted">
        Versandart
      </h3>
      <p class="text-[15px] text-pretty text-toned mt-1">
        {{ shippingMethod.name }}
      </p>
    </div>
  </div>
</template>
