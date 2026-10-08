<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Order details of the presets (#445): order facts as a description list,
 * the dishes as receipt lines and the totals. Every state is spelled out,
 * nothing depends on colour.
 */
const props = defineProps<{
  order: Schemas["Order"];
  status?: string;
}>();

const { getFormattedPrice } = useCommercePrice();

const lineItems = computed(
  () =>
    props.order.lineItems?.filter(
      (item: Schemas["OrderLineItem"]) => item.parentId === null,
    ) ?? [],
);

const transaction = computed(() => props.order.transactions?.at(-1));
const paymentState = computed(() => {
  const state = transaction.value?.stateMachineState;
  return state?.translated?.name ?? state?.name;
});
const paymentMethod = computed(() => {
  const method = transaction.value?.paymentMethod;
  return method?.translated?.distinguishableName ?? method?.distinguishableName;
});
const shippingMethod = computed(() => {
  const method = props.order.deliveries?.[0]?.shippingMethod;
  return method?.translated?.name ?? method?.name;
});
// The checkout stores the chosen time as "Wunschlieferzeit: …" (Summary.vue).
const wishedTime = computed(() =>
  props.order.customerComment?.replace(/^Wunschlieferzeit:\s*/, "").trim(),
);

// Restaurants sell gross prices; net orders (B2B) list the tax on top.
const taxLabel = computed(() =>
  props.order.taxStatus === "net" ? "zzgl. MwSt." : "enthaltene MwSt.",
);

const facts = computed(() =>
  [
    { label: "Status", value: props.status },
    { label: "Lieferung oder Abholung", value: shippingMethod.value },
    { label: "Wunschzeit", value: wishedTime.value },
    {
      label: "Bezahlung",
      value: [paymentMethod.value, paymentState.value]
        .filter(Boolean)
        .join(", "),
    },
  ].filter((fact) => fact.value),
);
</script>

<template>
  <div class="flex flex-col gap-6 font-body text-sb-ink">
    <dl v-if="facts.length" class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <div v-for="fact in facts" :key="fact.label">
        <dt class="text-sm text-sb-ink-muted">{{ fact.label }}</dt>
        <dd class="font-semibold">{{ fact.value }}</dd>
      </div>
    </dl>

    <ul class="flex flex-col border-t border-sb-line">
      <li
        v-for="item in lineItems"
        :key="item.id"
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-sb-line py-3"
      >
        <span class="font-semibold [overflow-wrap:anywhere] hyphens-auto">
          <span class="tabular-nums">{{ item.quantity }}×</span>
          {{ item.label }}
        </span>
        <span class="font-semibold tabular-nums">{{
          getFormattedPrice(item.totalPrice)
        }}</span>
        <span
          v-if="item.payload?.productNumber"
          class="text-sm text-sb-ink-muted"
          >Nr. {{ item.payload.productNumber }}</span
        >
      </li>
    </ul>

    <dl class="flex flex-col gap-1.5">
      <div class="flex justify-between gap-4 text-sb-ink-muted">
        <dt>Lieferkosten</dt>
        <dd class="tabular-nums">
          {{ getFormattedPrice(order.shippingTotal) }}
        </dd>
      </div>
      <div
        v-for="tax in order.price?.calculatedTaxes"
        :key="tax.taxRate"
        class="flex justify-between gap-4 text-sb-ink-muted"
      >
        <dt>{{ taxLabel }} {{ tax.taxRate }} %</dt>
        <dd class="tabular-nums">{{ getFormattedPrice(tax.tax) }}</dd>
      </div>
      <div
        class="mt-1 flex justify-between gap-4 border-t-[1.5px] border-sb-ink pt-2 text-lg font-bold"
      >
        <dt>Gesamt</dt>
        <dd class="tabular-nums">{{ getFormattedPrice(order.amountTotal) }}</dd>
      </div>
    </dl>
  </div>
</template>
