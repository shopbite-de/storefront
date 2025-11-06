<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

useHead({
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ],
});

// Constants
const SUCCESS_TOAST_CONFIG = {
  title: "Erfolgreich abgesendet!",
  description: "Bitte überprüfen Sie Ihre Postfach.",
  icon: "i-lucide-check",
  color: "success" as const,
  duration: 0,
  close: true,
};

const ERROR_TOAST_CONFIG = {
  title: "Fehler beim Senden",
  icon: "i-lucide-x",
  description: "Bitte versuchen Sie es später erneut.",
  color: "error" as const,
};

const { apiClient } = useShopwareContext();
const toast = useToast();

const schema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

type Schema = z.output<typeof schema>;

const fields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Email-Adresse eingeben",
    required: true,
  },
];

// Extract toast creation functions
function showSuccessToast(): void {
  toast.add(SUCCESS_TOAST_CONFIG);
}

function showErrorToast(): void {
  toast.add(ERROR_TOAST_CONFIG);
}

async function handlePasswordRecovery(payload: FormSubmitEvent<Schema>) {
  try {
    await apiClient.invoke("sendRecoveryMail post /account/recovery-password", {
      body: {
        email: payload.data.email,
        storefrontUrl: useRuntimeConfig().public.storeUrl,
      },
    });
    showSuccessToast();
  } catch (error) {
    showErrorToast();
    console.error("Password recovery error:", error);
  }
}
</script>
<template>
  <UContainer class="max-w-xl mx-auto mt-18">
    <UAuthForm
      :schema="schema"
      title="Password vergessen"
      icon="i-lucide-shield-user"
      :fields="fields"
      :submit="{
        label: 'Senden',
      }"
      @submit="handlePasswordRecovery"
    >
      <template #description>
        <p>
          Geben Sie Ihre E-Mail-Adresse ein um Ihr Passwort zurückzusetzten.
        </p>
        <p>
          Wenn Sie bei uns ein Kundenkonto mit dieser Adresse angelegt haben
          bekommen Sie in den nächsten Minuten eine E-Mail zugesendet mit
          weiteren Anweisungen.
        </p>
      </template>
      <template #footer>
        Beim absenden stimmst du unseren
        <ULink to="datenschutz" class="text-primary font-medium"
          >Datenschutzbestimmungen</ULink
        >
        zu.
      </template>
    </UAuthForm>
  </UContainer>
</template>
