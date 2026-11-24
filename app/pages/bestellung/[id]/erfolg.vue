<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({
  title: t("order.paymentSuccess.title"),
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { refresh: refreshCart } = useCartData();

onMounted(() => {
  refreshCart().catch((error) => console.error("[cart] refresh", error));
});
</script>

<template>
  <OrderConfirmation :order-id="orderId" kind="success" />
</template>
