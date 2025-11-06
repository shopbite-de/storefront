<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  paymentMethod: Schemas["PaymentMethod"] | null;
}>();

const { paymentMethod } = toRefs(props);
</script>

<template>
  <div
    v-if="paymentMethod !== null"
    class="flex flex-row gap-8 p-6 border rounded-lg border-primary"
  >
    <NuxtImg
      v-if="paymentMethod.media?.url"
      :src="paymentMethod.media?.url"
      width="50"
    />
    <div>
      <h3 class="text-base text-pretty font-semibold text-highlighted">
        Zahlart
      </h3>
      <p class="text-[15px] text-pretty text-toned mt-1">
        {{ paymentMethod.distinguishableName }}
      </p>
    </div>
  </div>
</template>
