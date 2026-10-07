<script setup lang="ts">
import * as z from "zod";
import { ApiClientError } from "@shopware/api-client";

/**
 * Login of the presets (#443), same checks and call as User/LoginForm.vue
 * with the base components; errors show at the fields and above the form.
 */
const emit = defineEmits<{ "login-success": [email: string] }>();

const { login } = useUser();

const schema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z.string().min(8, "Das Passwort hat mindestens 8 Zeichen."),
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
      next[key] ??= issue.message;
    }
    errors.value = next;
    return;
  }
  errors.value = {};
  submitting.value = true;
  try {
    await login({ username: state.email, password: state.password });
    emit("login-success", state.email);
  } catch (error) {
    console.error("Login failed:", error);
    let message = "Bitte überprüfen Sie Ihre Zugangsdaten.";
    if (error instanceof ApiClientError) {
      const details = error.details?.errors;
      if (Array.isArray(details) && details.length > 0) {
        message = details
          .map((detail) => detail.detail || detail.title)
          .filter(Boolean)
          .join("\n");
      }
    }
    loginError.value = message;
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
      <strong class="block text-base">Anmeldung fehlgeschlagen</strong>
      {{ loginError }}
    </div>
    <SbField
      v-slot="{ id, describedBy, invalid }"
      label="E-Mail"
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
      label="Passwort"
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
      to="/passwort-vergessen"
      class="inline-flex min-h-11 items-center self-start text-sm font-semibold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
      >Passwort vergessen?</NuxtLink
    >
    <SbButton type="submit" size="lg" block :loading="submitting"
      >Anmelden</SbButton
    >
  </form>
</template>
