<script setup lang="ts">
useSeoMeta({
  title: "Bestellung",
  robots: "noindex, nofollow",
});

const route = useRoute();
const orderId = route.params.id as string;
</script>

<template>
  <OrderConfirmation :order-id="orderId" />
</template>
