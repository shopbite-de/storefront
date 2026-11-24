<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("auth.registrationPage.title"),
});

const { isLoggedIn } = useCustomer();

if (import.meta.client && isLoggedIn.value) {
  navigateTo({ name: "konto" });
}

watch(isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    navigateTo({ name: "konto" });
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

  navigateTo({ name: "konto" });
}
</script>

<template>
  <UserAuthPanel :title="$t('auth.registrationPage.title')" wide>
    <template #intro>
      <p>{{ $t("auth.registrationPage.intro") }}</p>
    </template>
    <div
      v-if="confirmationSent"
      role="status"
      class="rounded-sb-control bg-sb-primary-tint p-4 text-sb-primary-ink"
    >
      <strong class="block">{{
        $t("auth.registrationPage.confirmationTitle")
      }}</strong>
      {{ $t("auth.registrationPage.confirmationText") }}
    </div>
    <UserRegistrationForm
      v-else
      :allow-guest="false"
      @registration-success="onRegistrationSuccess"
    />
    <template #footer>
      {{ $t("auth.registrationPage.alreadyRegistered") }}
      <NuxtLink
        :to="{ name: 'anmelden' }"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >{{ $t("auth.shared.login") }}</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
