<script setup lang="ts">
useSeoMeta({
  title: "Anmelden",
});

const { isLoggedIn } = useCustomer();

onBeforeMount(async () => {
  if (import.meta.client && isLoggedIn.value) {
    navigateTo({ name: "konto" });
  }
});

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    navigateTo({ name: "konto" });
  }
});

// app.vue moves the guest's wishlist into the account (#467).
function handleLoginSuccess() {
  navigateTo("/");
}
</script>

<template>
  <UserAuthPanel title="Anmelden">
    <UserLoginForm @login-success="handleLoginSuccess" />
    <template #footer>
      Noch kein Kundenkonto?
      <NuxtLink
        :to="{ name: 'registrierung' }"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >Jetzt registrieren</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
