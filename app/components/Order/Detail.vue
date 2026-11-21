<script setup lang="ts">
import type { Order } from "../../../shared/domain";

/**
 * Order details of the presets (#445): order facts as a description list,
 * the dishes as receipt lines and the totals, from the domain `Order`
 * (ADR 0001, step 5). Every state is spelled out, nothing depends on
 * colour.
 */
const props = defineProps<{ order: Order }>();

const { getFormattedMoney } = useCommercePrice();

// The checkout's wished time ("Wunschlieferzeit"/"Wunschabholzeit" in the
// order); another note of the guest where there is none.
const wishedTime = computed(() => {
  const wished = props.order.wishedTime;
  return wished ? formatClock(wished.time.minutes) : (props.order.note ?? "");
});

// Restaurants sell gross prices; net orders (B2B) list the tax on top.
const taxLabel = computed(() =>
  props.order.taxIncluded ? "enthaltene MwSt." : "zzgl. MwSt.",
);

const facts = computed(() =>
  [
    { label: "Status", value: ORDER_STATUS_LABEL[props.order.status] },
    {
      label: "Lieferung oder Abholung",
      value: props.order.shippingMethod.name,
    },
    { label: "Wunschzeit", value: wishedTime.value },
    {
      label: "Bezahlung",
      value: [
        props.order.paymentMethod.name,
        PAYMENT_STATUS_LABEL[props.order.paymentStatus],
      ]
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
        v-for="line in order.lines"
        :key="line.id"
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-sb-line py-3"
      >
        <span class="font-semibold [overflow-wrap:anywhere] hyphens-auto">
          <span class="tabular-nums">{{ line.quantity }}×</span>
          {{ cartLineLabel(line) }}
        </span>
        <span class="font-semibold tabular-nums">{{
          getFormattedMoney(line.totalPrice)
        }}</span>
        <span v-if="line.dishNumber" class="text-sm text-sb-ink-muted"
          >Nr. {{ line.dishNumber }}</span
        >
      </li>
      <li
        v-for="discount in order.discounts"
        :key="`${discount.code ?? ''}-${discount.name}`"
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-sb-line py-3"
      >
        <span class="font-semibold [overflow-wrap:anywhere] hyphens-auto">
          <span class="tabular-nums">1×</span>
          {{ discount.name }}
        </span>
        <span class="font-semibold tabular-nums">{{
          getFormattedMoney(discount.amount)
        }}</span>
      </li>
    </ul>

    <dl class="flex flex-col gap-1.5">
      <div class="flex justify-between gap-4 text-sb-ink-muted">
        <dt>Lieferkosten</dt>
        <dd class="tabular-nums">
          {{ getFormattedMoney(order.shippingCosts) }}
        </dd>
      </div>
      <div
        v-for="tax in order.taxes"
        :key="tax.rate"
        class="flex justify-between gap-4 text-sb-ink-muted"
      >
        <dt>{{ taxLabel }} {{ tax.rate }} %</dt>
        <dd class="tabular-nums">{{ getFormattedMoney(tax.amount) }}</dd>
      </div>
      <div
        class="mt-1 flex justify-between gap-4 border-t-[1.5px] border-sb-ink pt-2 text-lg font-bold"
      >
        <dt>Gesamt</dt>
        <dd class="tabular-nums">{{ getFormattedMoney(order.total) }}</dd>
      </div>
    </dl>
  </div>
</template>
