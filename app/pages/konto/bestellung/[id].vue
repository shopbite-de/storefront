<script setup lang="ts">
import { useOrderDetails } from "@shopware/composables";
import { formatDate } from "~/utils/formatDate";
import type { Schemas } from "#shopware";

import type { RouteParams } from "vue-router";

definePageMeta({
  layout: "account",
});

interface OrderRouteParams extends RouteParams {
  id: string;
}

const route = useRoute();
const { id } = route.params as OrderRouteParams;
const {
  order: orderRaw,
  loadOrderDetails,
  status,
} = useOrderDetails(id as string);
const order = computed(
  () => orderRaw.value as Schemas["Order"] | undefined | null,
);

const isLoadingData = ref(true);

onMounted(async () => {
  isLoadingData.value = true;

  await loadOrderDetails();

  isLoadingData.value = false;
});
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="BESTELLUNG"
      :title="order?.orderNumber"
      :description="formatDate(order?.createdAt)"
    />
    <UPageBody>
      <OrderDetail
        v-if="order"
        :order="order as Schemas['Order']"
        :status="status ?? 'laden...'"
      />
    </UPageBody>
  </UContainer>
</template>
