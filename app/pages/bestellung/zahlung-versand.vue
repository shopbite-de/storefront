<script setup lang="ts">
useSeoMeta({
  title: "Zahlung & Versand",
  robots: "noindex, nofollow",
});

const { isLoggedIn, isGuestSession } = useUser();

if (!isLoggedIn.value && !isGuestSession.value) {
  await navigateTo("/bestellung/warenkorb");
}
</script>

<template>
  <div class="flex flex-col gap-8 py-8">
    <CheckoutPaymentAndDelivery />
    <UButton
      label="Weiter zu Prüfen & Bestellen"
      trailing-icon="i-lucide-arrow-right"
      size="xl"
      block
      to="/bestellung/bestaetigen"
    />
  </div>
</template>
