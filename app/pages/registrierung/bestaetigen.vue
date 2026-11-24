<script setup lang="ts">
const { t } = useI18n();

useSeoMeta({
  title: t("auth.registrationConfirmPage.title"),
});

const route = useRoute();
const router = useRouter();

const { confirmRegistration: confirm } = useCustomer();
const { refresh: refreshCart } = useCartData();

type ConfirmError = "invalid" | "already-confirmed";

const error = ref<ConfirmError | null>(null);

const messages: Record<ConfirmError, { title: string; description: string }> = {
  invalid: {
    title: t("auth.registrationConfirmPage.invalidTitle"),
    description: t("auth.registrationConfirmPage.invalidDescription"),
  },
  "already-confirmed": {
    title: t("auth.registrationConfirmPage.alreadyConfirmedTitle"),
    description: t("auth.registrationConfirmPage.alreadyConfirmedDescription"),
  },
};

const toConfirmError = (e: unknown): ConfirmError =>
  domainErrorCode(e) === "already_confirmed" ? "already-confirmed" : "invalid";

async function confirmRegistration() {
  const em = route.query.em;
  const hash = route.query.hash;
  // One-time secrets: off the address bar (history, tracking, shared
  // screenshots) once read.
  router.replace({ query: {} });
  if (typeof em !== "string" || typeof hash !== "string" || !em || !hash) {
    error.value = "invalid";
    return;
  }

  try {
    // the link's parameters, passed on as they came (ADR 0001, step 6);
    // the backend logs the customer in and the session is resealed
    await confirm({ em, hash });
  } catch (e) {
    console.error("Registration confirmation failed:", domainErrorCode(e));
    error.value = toConfirmError(e);
    return;
  }

  refreshCart().catch((error) => console.error("[cart] refresh", error));
  await navigateTo({ name: "konto" });
}

// The route is client-side rendered (routeRules), so this never runs on the
// server.
confirmRegistration();
</script>

<template>
  <UserAuthPanel :title="$t('auth.registrationConfirmPage.title')">
    <p v-if="!error" role="status">
      {{ $t("auth.registrationConfirmPage.confirming") }}
    </p>
    <div
      v-else
      :role="error === 'invalid' ? 'alert' : 'status'"
      class="flex flex-col items-start gap-4"
    >
      <p>
        <strong class="block">{{ messages[error].title }}</strong>
        {{ messages[error].description }}
      </p>
      <div class="flex flex-wrap gap-3">
        <SbButton :to="{ name: 'anmelden' }">{{
          $t("auth.shared.toLogin")
        }}</SbButton>
        <SbButton
          v-if="error === 'invalid'"
          variant="secondary"
          :to="{ name: 'kontakt' }"
          >{{ $t("auth.registrationConfirmPage.contact") }}</SbButton
        >
      </div>
    </div>
  </UserAuthPanel>
</template>
