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

// With double opt-in there is no login until the e-mail link is confirmed:
// the visitor stays and reads that the mail is on its way (before, the
// page went to the login and the notice was lost).
const confirmationSent = ref(false);

function onRegistrationSuccess(_data: unknown, needsConfirmation: boolean) {
  if (needsConfirmation) {
    confirmationSent.value = true;
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
    <div
      v-if="confirmationSent"
      role="status"
      class="rounded-sb-control bg-sb-primary-tint p-4 text-sb-primary-ink"
    >
      <strong class="block">Fast geschafft</strong>
      Wir haben Ihnen eine E-Mail geschickt. Bitte bestätigen Sie den Link
      darin, um Ihr Konto zu aktivieren.
    </div>
    <UserRegistrationForm
      v-else
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
