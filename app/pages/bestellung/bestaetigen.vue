<script setup lang="ts">
import { useCheckoutStore } from "~/stores/checkout";

const { isLoggedIn, isGuestSession } = useUser();
const { setStep } = useCheckoutStore();

if (!isLoggedIn.value && !isGuestSession.value) {
  await navigateTo("/bestellung/warenkorb");
}

setStep(2);
</script>

<template>
  <CheckoutSummary />
</template>
