<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  order: Schemas["Order"];
  status: string;
}>();

const { order } = toRefs(props);

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});

const lineItems = computed(() =>
  order.value?.lineItems?.filter(
    (item: Schemas["OrderLineItem"]) => item.parentId === null,
  ),
);

const paymentState = computed(
  () => order.value?.transactions?.at(-1)?.stateMachineState,
);

type BadgeColor =
  "success" | "error" | "warning" | "info" | "neutral" | "primary";

const paymentStateColor = computed((): BadgeColor => {
  switch (paymentState.value?.technicalName) {
    case "paid":
    case "authorized":
      return "success";
    case "failed":
    case "cancelled":
    case "chargeback":
      return "error";
    case "open":
    case "reminded":
    case "unconfirmed":
      return "warning";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap gap-2">
      <UBadge variant="subtle" color="neutral" icon="i-lucide-package">
        {{ status }}
      </UBadge>
      <UBadge
        v-if="order?.deliveries?.[0]?.shippingMethod?.name"
        variant="subtle"
        color="neutral"
        icon="i-lucide-truck"
      >
        {{ order.deliveries[0].shippingMethod.name }}
      </UBadge>
      <UBadge
        v-if="paymentState"
        variant="subtle"
        :color="paymentStateColor"
        icon="i-lucide-credit-card"
      >
        {{ paymentState.translated?.name ?? paymentState.name }}
      </UBadge>
    </div>

    <ul class="flex flex-col divide-y divide-default">
      <li
        v-for="item in lineItems"
        :key="item.id"
        class="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
      >
        <div
          class="size-10 rounded-md bg-elevated flex items-center justify-center shrink-0 text-sm font-semibold text-muted"
        >
          {{ item.quantity }}×
        </div>
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <p class="font-medium truncate">{{ item.label }}</p>
          <p
            v-if="item.payload?.productNumber"
            class="text-xs text-muted truncate"
          >
            #{{ item.payload.productNumber }}
          </p>
        </div>
        <p class="font-semibold shrink-0">
          {{ getFormattedPrice(item.totalPrice) }}
        </p>
      </li>
    </ul>

    <USeparator />

    <div class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between text-muted">
        <span>Lieferkosten</span>
        <span>{{ getFormattedPrice(order?.shippingTotal) }}</span>
      </div>
      <div class="flex justify-between text-muted">
        <span>Netto</span>
        <span>{{ getFormattedPrice(order?.amountNet) }}</span>
      </div>
      <div
        v-for="tax in order?.price?.calculatedTaxes"
        :key="tax.taxRate"
        class="flex justify-between text-muted"
      >
        <span>MwSt. {{ tax.taxRate }}%</span>
        <span>{{ getFormattedPrice(tax.tax) }}</span>
      </div>
      <div class="flex justify-between font-semibold text-base pt-1">
        <span>Gesamt</span>
        <span>{{ getFormattedPrice(order?.amountTotal) }}</span>
      </div>
    </div>
  </div>
</template>
