<script setup lang="ts">
useSeoMeta({
  title: "Zahlung erfolgreich",
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;

const { refreshCart } = useCart();

onMounted(async () => {
  await refreshCart();
});
</script>

<template>
  <OrderConfirmation :order-id="orderId" kind="success" />
</template>
