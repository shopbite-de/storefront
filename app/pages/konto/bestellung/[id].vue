<script setup lang="ts">
definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Bestellung",
});

const route = useRoute();
const orderId = route.params.id as string;
</script>

<template>
  <div class="flex flex-col gap-4">
    <NuxtLink
      to="/konto/bestellungen"
      class="inline-flex min-h-11 items-center self-start font-body font-semibold text-sb-primary-ink underline underline-offset-4"
      >Alle Bestellungen</NuxtLink
    >
    <OrderConfirmation :order-id="orderId" />
  </div>
</template>
