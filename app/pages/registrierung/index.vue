<script setup lang="ts">
useSeoMeta({
  title: "Registrieren",
});

const { isLoggedIn } = useCustomer();

if (import.meta.client && isLoggedIn.value) {
  navigateTo({ path: "/konto" });
}

watch(isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    navigateTo({ path: "/konto" });
  }
});

function onRegistrationSuccess(_data: unknown, needsConfirmation: boolean) {
  // With double opt-in the customer stays inactive until the e-mail link is
  // clicked, so there is no account session to show yet.
  if (needsConfirmation) {
    navigateTo("/anmelden");
    return;
  }

  navigateTo("/konto");
}
</script>

<template>
  <UserAuthPanel title="Registrieren" wide>
    <template #intro>
      <p>
        Mit einem Kundenkonto bestellen Sie schneller, Ihre Adressen sind
        gespeichert.
      </p>
    </template>
    <UserRegistrationForm
      :allow-guest="false"
      @registration-success="onRegistrationSuccess"
    />
    <template #footer>
      Schon registriert?
      <NuxtLink
        to="/anmelden"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >Anmelden</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
