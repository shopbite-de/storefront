<script setup lang="ts">
useSeoMeta({
  title: "Prüfen & Bestellen",
  robots: "noindex, nofollow",
});

const { isLoggedIn, isGuestSession } = useUser();

if (!isLoggedIn.value && !isGuestSession.value) {
  await navigateTo("/bestellung/warenkorb");
}
</script>

<template>
  <CheckoutSummary />
</template>
