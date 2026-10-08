<script setup lang="ts">
useSeoMeta({
  title: "Anmelden",
});

const { isLoggedIn } = useUser();

onBeforeMount(async () => {
  if (import.meta.client && isLoggedIn.value) {
    navigateTo({ path: "/konto" });
  }
});

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    navigateTo({ path: "/konto" });
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
        to="/registrierung"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >Jetzt registrieren</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
