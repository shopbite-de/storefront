<script setup lang="ts">
const {
  public: { site },
} = useRuntimeConfig();

useSeoMeta({
  title: `Prüfen & Bestellen | ${site.name}`,
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
