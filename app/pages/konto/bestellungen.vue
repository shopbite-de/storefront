<script setup lang="ts">
import { formatDate } from "~/utils/formatDate";

definePageMeta({
  layout: "account",
});

const { orders, loadOrders } = useCustomerOrders();

onMounted(() => {
  loadOrders();
});

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="KONTO"
      title="Meine Bestellungen"
      description="Historie deiner Bestellungen."
    />
    <UPageBody>
      <UPageList divide>
        <UPageCard
          v-for="order in orders"
          :key="order.id"
          variant="ghost"
          :to="'/konto/bestellung/' + order.id"
          :ui="{
            root: 'shadow-md rounded-md',
            footer: 'w-full',
          }"
        >
          <template #default>
            <div class="flex flex-row justify-between">
              <div>Bestellung: {{ order.orderNumber }}</div>
              <div>vom: {{ formatDate(order.createdAt) }}</div>
              <div>
                Gesamtbetrag: {{ getFormattedPrice(order.amountTotal) }}
              </div>
              <UIcon name="i-lucide-eye" class="size-6" />
            </div>
          </template>
        </UPageCard>
      </UPageList>
    </UPageBody>
  </UContainer>
</template>
