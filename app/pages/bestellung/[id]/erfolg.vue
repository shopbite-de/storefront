<script setup lang="ts">
useSeoMeta({
  title: "Zahlung erfolgreich",
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
