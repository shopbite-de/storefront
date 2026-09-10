<script setup lang="ts">
useSeoMeta({
  title: "Prüfen & Bestellen",
  robots: "noindex, nofollow",
});

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
