<script setup lang="ts">
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
const { order, loadOrderDetails, status } = useCommerceOrderDetails(id);

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
      <OrderDetail v-if="order" :order="order" :status="status ?? 'laden...'" />
    </UPageBody>
  </UContainer>
</template>
