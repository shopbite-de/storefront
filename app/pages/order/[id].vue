<script setup lang="ts">
import { useOrderDetails } from "@shopware/composables";
import { formatDate } from "~/utils/formatDate";

import type { RouteParams } from "vue-router";
import type { ButtonProps } from "#ui/components/Button.vue";

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
const links = ref<ButtonProps[]>([
  {
    label: "Zurück zur Startseite",
    to: "/",
    color: "error",
    variant: "subtle",
  },
]);
</script>

<template>
  <!-- Show loading spinner while fetching order data -->
  <UContainer v-if="isLoadingData">
    <UPageHeader headline="BESTELLUNG" title="Lädt..." />
    <UPageBody>
      <div class="flex flex-col items-center justify-center py-16 gap-4">
        <UIcon
          name="i-lucide-loader-circle"
          class="w-12 h-12 animate-spin text-primary"
        />
        <p class="text-lg text-muted">Bestellung wird geladen...</p>
      </div>
    </UPageBody>
  </UContainer>

  <UContainer v-else-if="order">
    <UPageHeader
      headline="BESTELLUNG"
      :title="order?.orderNumber"
      :description="formatDate(order?.createdAt)"
    />
    <UPageBody>
      <OrderDetail :order="order" :status="status ?? 'laden...'" />
    </UPageBody>
  </UContainer>

  <UContainer v-else>
    <UPageSection
      headline="FEHLER"
      title="Irgendwas ist schief gelaufen"
      description="Sie können Speisen und Getränke abholen, liefern lassen, oder vor Ort in unserem Restaurant genießen."
      :links="links"
    />
  </UContainer>
</template>
