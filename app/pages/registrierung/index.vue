<script setup lang="ts">
const { isLoggedIn } = useUser();

if (import.meta.client && isLoggedIn.value) {
  navigateTo({ path: "/konto" });
}

watch(isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    navigateTo({ path: "/konto" });
  }
});
</script>

<template>
  <UPageSection
    class="max-w-2xl mx-auto"
    headline="KONTO"
    title="Registrieren"
    description="Erstelle dein Kundenkonto."
  >
    <UserRegistrationForm @registration-success="navigateTo('/konto')" />
  </UPageSection>
</template>
