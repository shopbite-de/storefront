<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

useHead({
  title: "Passwort zurücksetzen",
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ],
});

// Constants
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_MIN_LENGTH_ERROR = "Das Passwort braucht mindestens 8 Zeichen.";
const PASSWORD_MISMATCH_ERROR = "Die Passwörter stimmen nicht überein.";
const SUCCESS_TOAST_CONFIG = {
  title: "Erfolgreich zurückgesetzt!",
  description: "Melden Sie sich nun mit Ihrem neuen Passwort an.",
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
const route = useRoute();
const toast = useToast();

// Schemas
const routeValidationSchema = z.object({
  hash: z.string().min(1, "Hash parameter is required and cannot be empty"),
});

const passwordResetSchema = z
  .object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_ERROR),
    newPasswordConfirm: z
      .string()
      .min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_ERROR),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: PASSWORD_MISMATCH_ERROR,
    path: ["newPasswordConfirm"],
  });

type PasswordResetSchema = z.output<typeof passwordResetSchema>;

// Extract route validation logic
function validateRouteParameters(): string {
  try {
    const validatedParams = routeValidationSchema.parse(route.query);
    return validatedParams.hash as string;
  } catch (error) {
    console.error("Invalid route parameters:", error);
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid validation",
    });
  }
}

// Extract toast creation functions
function showSuccessToast(): void {
  toast.add(SUCCESS_TOAST_CONFIG);
}

function showErrorToast(): void {
  toast.add(ERROR_TOAST_CONFIG);
}

const recoveryHash = ref<string>("");
recoveryHash.value = validateRouteParameters();

const formFields = [
  {
    name: "newPassword",
    type: "password" as const,
    label: "Neues Passwort",
    placeholder: "Neues Passwort eingeben",
    required: true,
  },
  {
    name: "newPasswordConfirm",
    type: "password" as const,
    label: "Neues Passwort wiederholen",
    placeholder: "Neues Passwort wiederholen",
    required: true,
  },
];

async function resetPassword(data: PasswordResetSchema) {
  await apiClient.invoke(
    "recoveryPassword post /account/recovery-password-confirm",
    {
      body: {
        newPassword: data.newPassword,
        newPasswordConfirm: data.newPasswordConfirm,
        hash: recoveryHash.value,
      },
    },
  );
}

async function handlePasswordReset(
  payload: FormSubmitEvent<PasswordResetSchema>,
) {
  try {
    await resetPassword(payload.data);
    showSuccessToast();
    navigateTo("/anmelden");
  } catch (error) {
    showErrorToast();
    console.error("Password recovery error:", error);
  }
}

// Presets (#445): errors and the result show in the form, not as toasts.
const { hasPreset } = useThemePreset();
const passwords = reactive({ newPassword: "", newPasswordConfirm: "" });
const errors = ref<Partial<Record<keyof PasswordResetSchema, string>>>({});
const result = ref<"done" | "failed" | null>(null);
const saving = ref(false);
const resultBox = ref<HTMLElement | null>(null);

async function onPresetSubmit() {
  result.value = null;
  const parsed = passwordResetSchema.safeParse(passwords);
  if (!parsed.success) {
    const next: typeof errors.value = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof PasswordResetSchema;
      next[key] ??= issue.message;
    }
    errors.value = next;
    return;
  }
  errors.value = {};
  saving.value = true;
  try {
    await resetPassword(parsed.data);
    result.value = "done";
  } catch (error) {
    console.error("Password recovery error:", error);
    result.value = "failed";
  } finally {
    saving.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}
</script>
<template>
  <UserAuthPanelPreset v-if="hasPreset" title="Neues Passwort">
    <div
      v-if="result === 'done'"
      ref="resultBox"
      role="status"
      tabindex="-1"
      class="flex flex-col items-start gap-4"
    >
      <p>
        <strong class="block">Ihr Passwort ist geändert.</strong>
        Sie können sich jetzt mit dem neuen Passwort anmelden.
      </p>
      <SbButton to="/anmelden">Zur Anmeldung</SbButton>
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
        <strong class="block"
          >Das Passwort konnte nicht geändert werden.</strong
        >
        Der Link ist vielleicht abgelaufen.
        <NuxtLink
          to="/passwort-vergessen"
          class="font-semibold text-sb-primary-ink underline underline-offset-4"
          >Neuen Link anfordern</NuxtLink
        >
      </div>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="Neues Passwort"
        hint="Mindestens 8 Zeichen"
        :error="errors.newPassword"
      >
        <SbInput
          :id="id"
          v-model="passwords.newPassword"
          name="newPassword"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="Neues Passwort wiederholen"
        :error="errors.newPasswordConfirm"
      >
        <SbInput
          :id="id"
          v-model="passwords.newPasswordConfirm"
          name="newPasswordConfirm"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbButton type="submit" size="lg" block :loading="saving"
        >Passwort speichern</SbButton
      >
    </form>
  </UserAuthPanelPreset>
  <UContainer v-else class="max-w-xl mx-auto mt-18">
    <UAuthForm
      :schema="passwordResetSchema"
      title="Password zurücksetzten"
      icon="i-lucide-shield-user"
      :fields="formFields"
      :submit="{
        label: 'Senden',
      }"
      @submit="handlePasswordReset"
    >
      <template #description>
        <p>Vergeben Sie hier Ihr neues Passwort.</p>
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
