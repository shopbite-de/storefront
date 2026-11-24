<script setup lang="ts">
import * as z from "zod";

const { t } = useI18n();

useHead({
  title: t("auth.passwordResetPage.headTitle"),
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ],
});

// Constants
const MIN_PASSWORD_LENGTH = 8;
// message keys, translated at the field
const PASSWORD_MIN_LENGTH_ERROR = "auth.passwordResetPage.passwordTooShort";
const PASSWORD_MISMATCH_ERROR = "auth.shared.passwordMismatch";

const { resetPassword: setNewPassword } = useCustomer();
const route = useRoute();
const router = useRouter();

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

// The hash is a one-time secret: remove it from the address bar (history,
// tracking, shared screenshots) once read. After hydration, so the server
// and the browser render the same page.
onMounted(() => {
  if (route.query.hash !== undefined) {
    router.replace({ query: {} });
  }
});

// the link's hash is the reset token (ADR 0001, step 6)
const resetPassword = (data: PasswordResetSchema) =>
  setNewPassword(recoveryHash.value, data.newPassword);

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
      next[key] ??= t(issue.message);
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
    // the code only: the error of a request carries its body
    console.error("Password recovery error:", domainErrorCode(error));
    result.value = "failed";
  } finally {
    saving.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}
</script>
<template>
  <UserAuthPanel :title="$t('auth.passwordResetPage.title')">
    <div
      v-if="result === 'done'"
      ref="resultBox"
      role="status"
      tabindex="-1"
      class="flex flex-col items-start gap-4"
    >
      <p>
        <strong class="block">{{
          $t("auth.passwordResetPage.doneTitle")
        }}</strong>
        {{ $t("auth.passwordResetPage.doneText") }}
      </p>
      <SbButton :to="{ name: 'anmelden' }">{{
        $t("auth.shared.toLogin")
      }}</SbButton>
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
        <strong class="block">{{
          $t("auth.passwordResetPage.failedTitle")
        }}</strong>
        {{ $t("auth.passwordResetPage.failedText") }}
        <NuxtLink
          :to="{ name: 'passwort-vergessen' }"
          class="font-semibold text-sb-primary-ink underline underline-offset-4"
          >{{ $t("auth.passwordResetPage.requestNewLink") }}</NuxtLink
        >
      </div>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.passwordResetPage.newPasswordLabel')"
        :hint="$t('auth.shared.passwordHint')"
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
        :label="$t('auth.passwordResetPage.newPasswordConfirmLabel')"
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
      <SbButton type="submit" size="lg" block :loading="saving">{{
        $t("auth.passwordResetPage.submit")
      }}</SbButton>
    </form>
  </UserAuthPanel>
</template>
