<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("auth.loginPage.title"),
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
  <UserAuthPanel :title="$t('auth.loginPage.title')">
    <UserLoginForm @login-success="handleLoginSuccess" />
    <template #footer>
      {{ $t("auth.loginPage.noAccount") }}
      <NuxtLink
        :to="{ name: 'registrierung' }"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >{{ $t("auth.loginPage.registerLink") }}</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
