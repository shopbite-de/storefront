<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { TableColumn } from "#ui/components/Table.vue";

const props = defineProps<{
  order: Schemas["Order"];
  status: string;
}>();

const { order } = toRefs(props);

const { getFormattedPrice } = usePrice({
  currencyCode: "EUR",
  localeCode: "de-DE",
});

const isLoadingData = ref(true);

const columns: TableColumn<Schemas["OrderLineItem"]>[] = [
  {
    accessorKey: "payload.productNumber",
    header: "#",
  },
  {
    accessorKey: "label",
    header: "Name",
  },
  {
    accessorKey: "unitPrice",
    header: "Preis",
    cell: ({ row }) => {
      return getFormattedPrice(row.getValue("unitPrice"));
    },
  },
  {
    accessorKey: "quantity",
    header: "Anzahl",
  },
  {
    accessorKey: "totalPrice",
    header: () => h("div", { class: "text-right" }, "Gesamt"),
    cell: ({ row }) => {
      const formatted = getFormattedPrice(row.getValue("totalPrice"));

      return h("div", { class: "text-right" }, formatted);
    },
  },
];

onMounted(() => {
  isLoadingData.value = false;
});

const columnRows = computed(() => {
  return order.value?.lineItems?.filter(
    (lineItem: Schemas["OrderLineItem"]) => lineItem.parentId === null,
  );
});
</script>

<template>
  <div>
    <div class="flex flex-row justify-between">
      <UBadge variant="outline" color="neutral" size="xl"
        >Status: {{ status }}</UBadge
      >
      <UBadge variant="outline" color="neutral" size="xl"
        >Versandart: {{ order?.deliveries?.[0]?.shippingMethod?.name }}</UBadge
      >
    </div>
    <UTable
      :columns="columns"
      :loading="isLoadingData"
      loading-color="primary"
      loading-animation="carousel"
      :data="columnRows"
      class="flex-1"
    />
    <div class="flex flex-col items-end w-full pr-4">
      <div>Lieferkosten: {{ getFormattedPrice(order?.shippingTotal) }}</div>
      <div>Gesamtkosten Netto: {{ getFormattedPrice(order?.amountNet) }}</div>
      <div v-for="tax in order?.price.calculatedTaxes" :key="tax.taxRate">
        inkl. {{ tax.taxRate }}% MwSt. {{ getFormattedPrice(tax.tax) }}
      </div>
      <div class="font-bold">
        Gesamtkosten Brutto: {{ getFormattedPrice(order?.amountTotal) }}
      </div>
    </div>
    <div class="p-2 text-balance mt-4">
      <div class="text-sm text-muted">
        Bei Fragen oder Problemen wenden Sie sich bitte telefonisch an uns.
      </div>
      <UButton
        label="Anrufen"
        variant="outline"
        color="primary"
        to="tel:+4917623456789"
        icon="i-heroicons-phone"
      />
    </div>
  </div>
</template>
