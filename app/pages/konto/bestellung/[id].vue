<script setup lang="ts">
definePageMeta({
  layout: "account",
});

const { t } = useI18n();

useSeoMeta({
  title: t("account.order.pageTitle"),
});

const route = useRoute();
const orderId = route.params.id as string;
</script>

<template>
  <div class="flex flex-col gap-4">
    <NuxtLink
      :to="{ name: 'konto-bestellungen' }"
      class="inline-flex min-h-11 items-center self-start font-body font-semibold text-sb-primary-ink underline underline-offset-4"
      >{{ $t("account.order.allOrders") }}</NuxtLink
    >
    <OrderConfirmation :order-id="orderId" />
  </div>
</template>
