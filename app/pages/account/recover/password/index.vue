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
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_MIN_LENGTH_ERROR = "Mindestens 8 Zeichen";
const PASSWORD_MISMATCH_ERROR = "Passwörter stimmen nicht überein";
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

async function handlePasswordReset(
  payload: FormSubmitEvent<PasswordResetSchema>,
) {
  try {
    await apiClient.invoke(
      "recoveryPassword post /account/recovery-password-confirm",
      {
        body: {
          newPassword: payload.data.newPassword,
          newPasswordConfirm: payload.data.newPasswordConfirm,
          hash: recoveryHash.value,
        },
      },
    );
    showSuccessToast();
    navigateTo("/anmelden");
  } catch (error) {
    showErrorToast();
    console.error("Password recovery error:", error);
  }
}
</script>
<template>
  <UContainer class="max-w-xl mx-auto mt-18">
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
