<script setup lang="ts">
import { useOrderDetails } from "@shopware/composables";
import { formatDate } from "~/utils/formatDate";

import type { RouteParams } from "vue-router";
import type { ButtonProps } from "#ui/components/Button.vue";

interface OrderRouteParams extends RouteParams {
  id: string;
}

useSeoMeta({
  title: "Bestellung",
});

const route = useRoute();
const { id } = route.params as OrderRouteParams;
const { order, loadOrderDetails, status } = useOrderDetails(id);
// Shop phone number for the "call us" card; hidden without one (#251).
const { site } = useRuntimeConfig().public;

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
  <UContainer v-if="isLoadingData">
    <!-- Show loading spinner while fetching order data -->
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
      :description="order.createdAt ? formatDate(order?.createdAt) : ''"
    />
    <UPageBody>
      <OrderDetail :order="order" :status="status ?? 'laden...'" />
      <UCard v-if="site.telephone" class="mt-6">
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div class="flex-1">
            <p class="font-semibold">Stimmt etwas nicht?</p>
            <p class="text-sm text-muted mt-0.5">
              Ruf uns sofort an, damit wir deine Bestellung noch rechtzeitig
              korrigieren können.
            </p>
          </div>
          <UButton
            :label="`Jetzt anrufen: ${site.telephone}`"
            color="primary"
            :to="toTelHref(site.telephone)"
            icon="i-lucide-phone"
            shrink-0
          />
        </div>
      </UCard>
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
