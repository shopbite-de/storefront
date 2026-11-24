<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: t("order.orderPage.title"),
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;
</script>

<template>
  <OrderConfirmation :order-id="orderId" />
</template>
