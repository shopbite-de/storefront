<script setup lang="ts">
import { ApiClientError } from "@shopware/api-client";

useSeoMeta({
  title: "Registrierung bestätigen",
});

const route = useRoute();

const { apiClient } = useShopwareContext();
const { refreshSessionContext } = useSessionContext();
const { refreshCart } = useCart();
const { mergeWishlistProducts } = useWishlist();

type ConfirmError = "invalid" | "already-confirmed";

const error = ref<ConfirmError | null>(null);

const messages: Record<ConfirmError, { title: string; description: string }> = {
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
  await navigateTo({ path: "/konto" });
}

// The route is client-side rendered (routeRules), so this never runs on the
// server.
confirmRegistration();
</script>

<template>
  <UserAuthPanel title="Registrierung bestätigen">
    <p v-if="!error" role="status">Registrierung wird bestätigt …</p>
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
        <SbButton to="/anmelden">Zur Anmeldung</SbButton>
        <SbButton v-if="error === 'invalid'" variant="secondary" to="/kontakt"
          >Kontakt</SbButton
        >
      </div>
    </div>
  </UserAuthPanel>
</template>
