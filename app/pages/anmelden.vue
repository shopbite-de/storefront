<script setup lang="ts">
import { useWishlist } from "@shopware/composables";

useSeoMeta({
  title: "Anmelden",
});

const { isLoggedIn } = useUser();
const { mergeWishlistProducts } = useWishlist();
const { hasPreset } = useThemePreset();

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
  <UserAuthPanelPreset v-if="hasPreset" title="Anmelden">
    <UserLoginFormPreset @login-success="handleLoginSuccess" />
    <template #footer>
      Noch kein Kundenkonto?
      <NuxtLink
        to="/registrierung"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >Jetzt registrieren</NuxtLink
      >
    </template>
  </UserAuthPanelPreset>
  <UContainer v-else>
    <div class="max-w-xl mx-auto mt-16">
      <UserLoginForm
        title="Anmelden"
        icon="i-lucide-user"
        with-register-hint
        @login-success="handleLoginSuccess"
      />
    </div>
  </UContainer>
</template>
