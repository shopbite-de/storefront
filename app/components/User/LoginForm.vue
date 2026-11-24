<script setup lang="ts">
import * as z from "zod";

/**
 * Login of the presets (#443) through the BFF (ADR 0001, step 6): errors
 * show at the fields and above the form, in the storefront's words by
 * domain code (wrong password and unknown e-mail alike, the backend's
 * limit with the seconds to wait).
 */
const emit = defineEmits<{ "login-success": [email: string] }>();

const { t } = useI18n();
const { login } = useCustomer();

// messages are message keys, translated at the field
const schema = z.object({
  email: z.string().email("auth.shared.emailInvalid"),
  password: z.string().min(8, "auth.loginForm.passwordTooShort"),
});

const state = reactive({ email: "", password: "" });
const errors = ref<Partial<Record<"email" | "password", string>>>({});
const loginError = ref<string | null>(null);
const submitting = ref(false);
const alertBox = ref<HTMLElement | null>(null);

async function onSubmit() {
  loginError.value = null;
  const result = schema.safeParse(state);
  if (!result.success) {
    const next: typeof errors.value = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as "email" | "password";
      next[key] ??= t(issue.message);
    }
    errors.value = next;
    return;
  }
  errors.value = {};
  submitting.value = true;
  try {
    await login(state.email, state.password);
    state.password = "";
    emit("login-success", state.email);
  } catch (error) {
    const code = domainErrorCode(error);
    // the code only: the error of a request carries its body
    console.error("Login failed:", code ?? "no answer");
    loginError.value = loginMessage(t, code, domainErrorDetails(error));
    await nextTick();
    alertBox.value?.focus();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form
    novalidate
    class="flex flex-col gap-4 font-body text-sb-ink"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="loginError"
      ref="alertBox"
      role="alert"
      tabindex="-1"
      class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm whitespace-pre-line"
    >
      <strong class="block text-base">{{
        $t("auth.loginForm.failedTitle")
      }}</strong>
      {{ loginError }}
    </div>
    <SbField
      v-slot="{ id, describedBy, invalid }"
      :label="$t('auth.shared.emailLabel')"
      :error="errors.email"
    >
      <SbInput
        :id="id"
        v-model="state.email"
        name="email"
        type="email"
        autocomplete="username"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>
    <SbField
      v-slot="{ id, describedBy, invalid }"
      :label="$t('auth.shared.passwordLabel')"
      :error="errors.password"
    >
      <SbInput
        :id="id"
        v-model="state.password"
        name="password"
        type="password"
        autocomplete="current-password"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>
    <NuxtLink
      :to="{ name: 'passwort-vergessen' }"
      class="inline-flex min-h-11 items-center self-start text-sm font-semibold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
      >{{ $t("auth.loginForm.forgotPassword") }}</NuxtLink
    >
    <SbButton type="submit" size="lg" block :loading="submitting">{{
      $t("auth.shared.login")
    }}</SbButton>
  </form>
</template>
