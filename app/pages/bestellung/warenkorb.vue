<script setup lang="ts">
const {
  public: { site },
} = useRuntimeConfig();

useSeoMeta({
  title: `Warenkorb | ${site.name}`,
  robots: "noindex, nofollow",
});

const { isLoggedIn, isGuestSession } = useCommerceUser();
const { isEmpty } = useCommerceCart();
const { setStep } = useCheckoutStore();

setStep(0);

const isCustomerAvailable = computed<boolean>(() => {
  return isLoggedIn.value || isGuestSession.value;
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8">
    <div class="flex flex-col gap-4">
      <h2 class="text-lg font-semibold">
        {{ isCustomerAvailable ? "Deine Daten" : "Anmelden oder registrieren" }}
      </h2>
      <CheckoutLoginOrRegister v-if="!isLoggedIn && !isGuestSession" />
      <UserDetail v-else :with-edit-button="true" />
    </div>

    <div class="flex flex-col gap-4">
      <h2 class="text-lg font-semibold">Warenkorb</h2>
      <UCard>
        <CartQuickView />
      </UCard>
      <UButton
        v-if="!isEmpty && isCustomerAvailable"
        label="Zahlungs- und Versandart auswählen"
        size="xl"
        block
        trailing-icon="i-lucide-arrow-right"
        to="/bestellung/zahlung-versand"
      />
      <UButton
        v-if="isEmpty"
        label="Zur Speisekarte"
        size="xl"
        block
        variant="outline"
        icon="i-lucide-arrow-left"
        to="/speisekarte"
      />
    </div>
  </div>
</template>
