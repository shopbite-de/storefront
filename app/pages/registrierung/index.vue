<script setup lang="ts">
import type { Schemas } from "#shopware";

useSeoMeta({
  title: "Registrieren",
});

const { isLoggedIn } = useUser();

if (import.meta.client && isLoggedIn.value) {
  navigateTo({ path: "/konto" });
}

watch(isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    navigateTo({ path: "/konto" });
  }
});

function onRegistrationSuccess(
  _data: unknown,
  customer: Schemas["Customer"] | undefined,
) {
  // With double opt-in the customer stays inactive until the e-mail link is
  // clicked, so there is no account session to show yet.
  if (customer?.doubleOptInRegistration && !customer?.active) {
    navigateTo("/anmelden");
    return;
  }

  navigateTo("/konto");
}
</script>

<template>
  <UPageSection
    class="max-w-2xl mx-auto"
    headline="KONTO"
    title="Registrieren"
    description="Erstelle dein Kundenkonto."
  >
    <UserRegistrationForm
      :allow-guest="false"
      @registration-success="onRegistrationSuccess"
    />
  </UPageSection>
</template>
