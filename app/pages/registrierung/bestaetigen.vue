<script setup lang="ts">
import { ApiClientError } from "@shopware/api-client";

useSeoMeta({
  title: "Registrierung bestätigen",
});

const route = useRoute();
const toast = useToast();

const { apiClient } = useShopwareContext();
const { refreshSessionContext } = useSessionContext();
const { refreshCart } = useCart();
const { mergeWishlistProducts } = useWishlist();

type ConfirmError = "invalid" | "already-confirmed";

const error = ref<ConfirmError | null>(null);
const { hasPreset } = useThemePreset();

// Presets (#445) address the guest formally.
const presetMessages: Record<
  ConfirmError,
  { title: string; description: string }
> = {
  invalid: {
    title: "Bestätigung fehlgeschlagen",
    description:
      "Der Bestätigungslink ist ungültig oder unvollständig. Bitte öffnen Sie den Link aus der E-Mail noch einmal oder schreiben Sie uns.",
  },
  "already-confirmed": {
    title: "Konto bereits bestätigt",
    description: "Ihr Konto ist schon bestätigt. Sie können sich anmelden.",
  },
};

const errorMessages: Record<
  ConfirmError,
  { title: string; description: string }
> = {
  invalid: {
    title: "Bestätigung fehlgeschlagen",
    description:
      "Der Bestätigungslink ist ungültig oder unvollständig. Bitte öffne den Link aus der Bestätigungs-E-Mail erneut oder kontaktiere uns.",
  },
  "already-confirmed": {
    title: "Konto bereits bestätigt",
    description:
      "Dein Konto ist schon bestätigt. Du kannst dich jetzt anmelden.",
  },
};

function toConfirmError(e: unknown): ConfirmError {
  const errors = e instanceof ApiClientError ? e.details?.errors : undefined;
  if (
    Array.isArray(errors) &&
    errors.some((err) => err.code === "CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED")
  ) {
    return "already-confirmed";
  }
  return "invalid";
}

async function confirmRegistration() {
  const em = route.query.em;
  const hash = route.query.hash;
  if (typeof em !== "string" || typeof hash !== "string" || !em || !hash) {
    error.value = "invalid";
    return;
  }

  try {
    await apiClient.invoke("registerConfirm post /account/register-confirm", {
      body: { em, hash },
    });
  } catch (e) {
    console.error("Registration confirmation failed:", e);
    error.value = toConfirmError(e);
    return;
  }

  // Shopware logs the customer in with the confirmation and switches the
  // context token, so load the new session before opening the account.
  await refreshSessionContext();
  refreshCart();
  mergeWishlistProducts();
  toast.add({
    title: "Bestätigung erfolgreich!",
    description: "Willkommen, dein Konto ist jetzt aktiv.",
    color: "success",
  });
  await navigateTo({ path: "/konto" });
}

// The route is client-side rendered (routeRules), so this never runs on the
// server.
confirmRegistration();
</script>

<template>
  <UserAuthPanelPreset v-if="hasPreset" title="Registrierung bestätigen">
    <p v-if="!error" role="status">Registrierung wird bestätigt …</p>
    <div
      v-else
      :role="error === 'invalid' ? 'alert' : 'status'"
      class="flex flex-col items-start gap-4"
    >
      <p>
        <strong class="block">{{ presetMessages[error].title }}</strong>
        {{ presetMessages[error].description }}
      </p>
      <div class="flex flex-wrap gap-3">
        <SbButton to="/anmelden">Zur Anmeldung</SbButton>
        <SbButton v-if="error === 'invalid'" variant="secondary" to="/kontakt"
          >Kontakt</SbButton
        >
      </div>
    </div>
  </UserAuthPanelPreset>
  <UContainer v-else>
    <div class="max-w-xl mx-auto mt-16">
      <div
        v-if="!error"
        class="flex items-center justify-center gap-2 text-muted"
        role="status"
      >
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        Registrierung wird bestätigt …
      </div>
      <UAlert
        v-else
        :color="error === 'already-confirmed' ? 'info' : 'error'"
        variant="subtle"
        :icon="
          error === 'already-confirmed'
            ? 'i-lucide-circle-check'
            : 'i-lucide-circle-alert'
        "
        :title="errorMessages[error].title"
        :description="errorMessages[error].description"
        :actions="[
          { label: 'Zur Anmeldung', to: '/anmelden', color: 'neutral' },
          ...(error === 'invalid'
            ? [
                {
                  label: 'Kontakt',
                  to: '/kontakt',
                  color: 'neutral' as const,
                  variant: 'outline' as const,
                },
              ]
            : []),
        ]"
      />
    </div>
  </UContainer>
</template>
