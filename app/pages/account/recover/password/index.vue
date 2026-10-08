<script setup lang="ts">
import * as z from "zod";

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

const { apiClient } = useShopwareContext();
const route = useRoute();

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

const recoveryHash = ref<string>("");
recoveryHash.value = validateRouteParameters();

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

// Errors and the result show in the form (#445).
const passwords = reactive({ newPassword: "", newPasswordConfirm: "" });
const errors = ref<Partial<Record<keyof PasswordResetSchema, string>>>({});
const result = ref<"done" | "failed" | null>(null);
const saving = ref(false);
const resultBox = ref<HTMLElement | null>(null);

async function onSubmit() {
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
  <UserAuthPanel title="Neues Passwort">
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
      @submit.prevent="onSubmit"
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
  </UserAuthPanel>
</template>
