<script setup lang="ts">
import { useWishlist } from "@shopware/composables";

useSeoMeta({
  title: "Anmelden",
});

const { isLoggedIn } = useUser();
const { mergeWishlistProducts } = useWishlist();

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

function handleLoginSuccess() {
  mergeWishlistProducts();
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
