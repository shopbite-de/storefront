<script setup lang="ts">
import { useOrderDetails } from "@shopware/composables";
import { formatDate } from "~/utils/formatDate";

import type { RouteParams } from "vue-router";

definePageMeta({
  layout: "account",
});

interface OrderRouteParams extends RouteParams {
  id: string;
}

const route = useRoute();
const { id } = route.params as OrderRouteParams;
const { order, loadOrderDetails, status } = useOrderDetails(id);

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
      <OrderDetail :order="order" :status="status ?? 'laden...'" />
    </UPageBody>
  </UContainer>
</template>
