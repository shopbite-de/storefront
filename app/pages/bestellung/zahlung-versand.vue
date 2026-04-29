<script setup lang="ts">
const {
  public: { site },
} = useRuntimeConfig();

useSeoMeta({
  title: `Zahlung & Versand | ${site.name}`,
  robots: "noindex, nofollow",
});

const { isLoggedIn, isGuestSession } = useCommerceUser();
const { setStep } = useCheckoutStore();

if (!isLoggedIn.value && !isGuestSession.value) {
  await navigateTo("/bestellung/warenkorb");
}

setStep(1);
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
