<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

useHead({
  title: "Passwort vergessen",
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

async function sendRecoveryMail(email: string) {
  await apiClient.invoke("sendRecoveryMail post /account/recovery-password", {
    body: {
      email,
      storefrontUrl: useRuntimeConfig().public.storeUrl,
    },
  });
}

async function handlePasswordRecovery(payload: FormSubmitEvent<Schema>) {
  try {
    await sendRecoveryMail(payload.data.email);
    showSuccessToast();
  } catch (error) {
    showErrorToast();
    console.error("Password recovery error:", error);
  }
}

// Presets (#445): errors and the result show in the form, not as toasts.
const { hasPreset } = useThemePreset();
const email = ref("");
const emailError = ref<string>();
const result = ref<"sent" | "failed" | null>(null);
const sending = ref(false);
const resultBox = ref<HTMLElement | null>(null);

async function onPresetSubmit() {
  result.value = null;
  const parsed = schema.safeParse({ email: email.value });
  if (!parsed.success) {
    emailError.value = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    return;
  }
  emailError.value = undefined;
  sending.value = true;
  try {
    await sendRecoveryMail(parsed.data.email);
    result.value = "sent";
  } catch (error) {
    console.error("Password recovery error:", error);
    result.value = "failed";
  } finally {
    sending.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}
</script>
<template>
  <UserAuthPanelPreset v-if="hasPreset" title="Passwort vergessen">
    <template #intro>
      <p>
        Geben Sie die E-Mail-Adresse Ihres Kundenkontos ein. Gibt es dazu ein
        Konto, bekommen Sie in den nächsten Minuten eine E-Mail mit einem Link
        für ein neues Passwort.
      </p>
    </template>
    <div
      v-if="result === 'sent'"
      ref="resultBox"
      role="status"
      tabindex="-1"
      class="flex flex-col gap-2"
    >
      <strong>E-Mail ist unterwegs</strong>
      <p>
        Bitte schauen Sie in Ihr Postfach, auch in den Spam-Ordner. Der Link ist
        nur begrenzt gültig.
      </p>
    </div>
    <form
      v-else
      novalidate
      class="flex flex-col gap-4"
      @submit.prevent="onPresetSubmit"
    >
      <div
        v-if="result === 'failed'"
        ref="resultBox"
        role="alert"
        tabindex="-1"
        class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
      >
        <strong class="block">Die E-Mail konnte nicht gesendet werden.</strong>
        Bitte versuchen Sie es später noch einmal.
      </div>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="E-Mail"
        :error="emailError"
      >
        <SbInput
          :id="id"
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbButton type="submit" size="lg" block :loading="sending"
        >Link senden</SbButton
      >
    </form>
    <template #footer>
      <NuxtLink
        to="/anmelden"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >Zurück zur Anmeldung</NuxtLink
      >
    </template>
  </UserAuthPanelPreset>
  <UContainer v-else class="max-w-xl mx-auto mt-18">
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
          Geben Sie Ihre E-Mail-Adresse ein um Ihr Passwort zurück zusetzten.
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
