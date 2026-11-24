<script setup lang="ts">
import * as z from "zod";

definePageMeta({
  layout: "account",
});

const { t } = useI18n();

useSeoMeta({
  title: t("account.profile.title"),
});

// The profile through the BFF (ADR 0001, step 6): names, the e-mail (with
// the password, as the backend asks), the password and the deletion.
const {
  customer: user,
  refresh: refreshUser,
  updateProfile,
  changeEmail,
  changePassword,
  deleteAccount,
} = useCustomer();
const loading = ref(true);
const open = ref(false);

const state = reactive({
  email: user.value?.email ?? "",
  firstName: user.value?.firstName ?? "",
  lastName: user.value?.lastName ?? "",
  emailPassword: "",
});

const emailChanged = computed(
  () =>
    state.email.trim().toLowerCase() !==
    (user.value?.email ?? "").toLowerCase(),
);

onMounted(async () => {
  try {
    await refreshUser();
  } catch (error) {
    console.error("[account] customer", domainErrorCode(error) ?? "no answer");
  }
  Object.assign(state, {
    email: user.value?.email ?? "",
    firstName: user.value?.firstName ?? "",
    lastName: user.value?.lastName ?? "",
  });
  loading.value = false;
});

// Validation, result and errors in the page (#445); the messages are keys.
const schema = z.object({
  firstName: z.string().min(1, "account.profile.validation.firstNameRequired"),
  lastName: z.string().min(1, "account.profile.validation.lastNameRequired"),
  email: z.string().email("account.profile.validation.emailInvalid"),
  emailPassword: z.string(),
});
type Schema = z.output<typeof schema>;
const errors = ref<Partial<Record<keyof Schema, string>>>({});
const saveResult = ref<"saved" | "failed" | null>(null);
const saveMessage = ref(t("account.profile.tryLater"));
const saving = ref(false);
const deleting = ref(false);
const deleteFailed = ref(false);
const resultBox = ref<HTMLElement | null>(null);
const form = ref<HTMLFormElement | null>(null);

async function onSubmit() {
  saveResult.value = null;
  const parsed = schema.safeParse(state);
  const next: typeof errors.value = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Schema;
      next[key] ??= t(issue.message);
    }
  }
  if (emailChanged.value && !state.emailPassword) {
    next.emailPassword = t("account.profile.validation.emailPasswordRequired");
  }
  if (!parsed.success || Object.keys(next).length) {
    errors.value = next;
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  errors.value = {};
  saving.value = true;
  try {
    const changingEmail = emailChanged.value;
    if (changingEmail) {
      await changeEmail(parsed.data.email, state.emailPassword);
      state.emailPassword = "";
    }
    // the names only when they changed (or nothing did: saved as before)
    const namesChanged =
      parsed.data.firstName !== user.value?.firstName ||
      parsed.data.lastName !== user.value?.lastName;
    if (namesChanged || !changingEmail) {
      await updateProfile({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      });
    }
    saveResult.value = "saved";
  } catch (error) {
    const code = domainErrorCode(error);
    // the code only: the error of a request carries its body
    console.error("Profile update error:", code ?? "no answer");
    saveMessage.value = credentialChangeMessage(
      t,
      code,
      domainErrorDetails(error),
    );
    saveResult.value = "failed";
  } finally {
    saving.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}

// The password (ADR 0001, step 6): the current one and a new one.
const MIN_PASSWORD_LENGTH = 8;
const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "account.profile.validation.currentPasswordRequired"),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        "account.profile.validation.newPasswordTooShort",
      ),
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "account.profile.validation.passwordsDiffer",
    path: ["newPasswordConfirm"],
  });
type PasswordSchema = z.output<typeof passwordSchema>;
const passwords = reactive({
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
});
const passwordErrors = ref<Partial<Record<keyof PasswordSchema, string>>>({});
const passwordResult = ref<"saved" | "saved-logged-out" | "failed" | null>(
  null,
);
const passwordMessage = ref("");
const passwordSaving = ref(false);
const passwordBox = ref<HTMLElement | null>(null);

async function onPasswordSubmit() {
  passwordResult.value = null;
  const parsed = passwordSchema.safeParse(passwords);
  if (!parsed.success) {
    const next: typeof passwordErrors.value = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof PasswordSchema;
      next[key] ??= t(issue.message);
    }
    passwordErrors.value = next;
    return;
  }
  passwordErrors.value = {};
  passwordSaving.value = true;
  try {
    const answer = await changePassword(
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    Object.assign(passwords, {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    });
    // changed either way; without a login the customer logs in again
    passwordResult.value =
      answer?.loggedIn === false ? "saved-logged-out" : "saved";
  } catch (error) {
    const code = domainErrorCode(error);
    console.error("Password change error:", code ?? "no answer");
    passwordMessage.value = credentialChangeMessage(
      t,
      code,
      domainErrorDetails(error),
    );
    passwordResult.value = "failed";
  } finally {
    passwordSaving.value = false;
  }
  await nextTick();
  passwordBox.value?.focus();
}

async function onDelete() {
  deleting.value = true;
  deleteFailed.value = false;
  try {
    await deleteAccount();
    open.value = false;
    navigateTo("/");
  } catch (error) {
    console.error(
      "Customer delete error:",
      domainErrorCode(error) ?? "no answer",
    );
    deleteFailed.value = true;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="font-body text-sb-ink">
    <UserAccountHeader :title="$t('account.profile.title')" />
    <p v-if="loading" role="status" class="text-sb-ink-muted">
      {{ $t("account.profile.loading") }}
    </p>
    <template v-else>
      <form
        ref="form"
        novalidate
        aria-labelledby="profil-daten"
        class="flex max-w-xl flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
        @submit.prevent="onSubmit"
      >
        <h2 id="profil-daten" class="sr-only">
          {{ $t("account.profile.personalData") }}
        </h2>
        <div
          v-if="saveResult"
          ref="resultBox"
          :role="saveResult === 'saved' ? 'status' : 'alert'"
          tabindex="-1"
          :class="[
            'rounded-sb-control p-4 text-sm',
            saveResult === 'saved'
              ? 'bg-sb-primary-tint text-sb-primary-ink'
              : 'border-[1.5px] border-sb-danger',
          ]"
        >
          <template v-if="saveResult === 'saved'">{{
            $t("account.profile.saved")
          }}</template>
          <template v-else>
            <strong class="block">{{
              $t("account.profile.saveFailed")
            }}</strong>
            {{ saveMessage }}
          </template>
        </div>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.firstName')"
          :error="errors.firstName"
        >
          <SbInput
            :id="id"
            v-model="state.firstName"
            name="firstName"
            autocomplete="given-name"
            :aria-describedby="describedBy"
            :invalid="invalid"
          />
        </SbField>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.lastName')"
          :error="errors.lastName"
        >
          <SbInput
            :id="id"
            v-model="state.lastName"
            name="lastName"
            autocomplete="family-name"
            :aria-describedby="describedBy"
            :invalid="invalid"
          />
        </SbField>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.email')"
          :error="errors.email"
        >
          <SbInput
            :id="id"
            v-model="state.email"
            name="email"
            type="email"
            autocomplete="email"
            :aria-describedby="describedBy"
            :invalid="invalid"
          />
        </SbField>
        <SbField
          v-if="emailChanged"
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.emailPassword')"
          :hint="$t('account.profile.emailPasswordHint')"
          :error="errors.emailPassword"
        >
          <SbInput
            :id="id"
            v-model="state.emailPassword"
            name="emailPassword"
            type="password"
            autocomplete="current-password"
            :aria-describedby="describedBy"
            :invalid="invalid"
          />
        </SbField>
        <SbButton
          type="submit"
          size="lg"
          :loading="saving"
          class="self-start"
          >{{ $t("account.profile.save") }}</SbButton
        >
      </form>
      <form
        novalidate
        aria-labelledby="passwort-aendern"
        class="mt-10 flex max-w-xl flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
        @submit.prevent="onPasswordSubmit"
      >
        <h2 id="passwort-aendern" class="font-display text-xl">
          {{ $t("account.profile.changePassword") }}
        </h2>
        <div
          v-if="passwordResult"
          ref="passwordBox"
          :role="passwordResult === 'failed' ? 'alert' : 'status'"
          tabindex="-1"
          :class="[
            'rounded-sb-control p-4 text-sm',
            passwordResult === 'failed'
              ? 'border-[1.5px] border-sb-danger'
              : 'bg-sb-primary-tint text-sb-primary-ink',
          ]"
        >
          <template v-if="passwordResult === 'saved'">{{
            $t("account.profile.passwordChanged")
          }}</template>
          <template v-else-if="passwordResult === 'saved-logged-out'">{{
            $t("account.profile.passwordChangedLoggedOut")
          }}</template>
          <template v-else>
            <strong class="block">{{
              $t("account.profile.passwordNotChanged")
            }}</strong>
            {{ passwordMessage }}
          </template>
        </div>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.currentPassword')"
          :error="passwordErrors.currentPassword"
        >
          <SbInput
            :id="id"
            v-model="passwords.currentPassword"
            name="currentPassword"
            type="password"
            autocomplete="current-password"
            :aria-describedby="describedBy"
            :invalid="invalid"
          />
        </SbField>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          :label="$t('account.profile.newPassword')"
          :hint="$t('account.profile.newPasswordHint')"
          :error="passwordErrors.newPassword"
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
          :label="$t('account.profile.newPasswordConfirm')"
          :error="passwordErrors.newPasswordConfirm"
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
        <SbButton
          type="submit"
          size="lg"
          :loading="passwordSaving"
          class="self-start"
          >{{ $t("account.profile.changePassword") }}</SbButton
        >
      </form>
      <section
        aria-labelledby="konto-loeschen"
        class="mt-10 flex max-w-xl flex-col items-start gap-3 border-t border-sb-line pt-6"
      >
        <h2 id="konto-loeschen" class="font-display text-xl">
          {{ $t("account.profile.deleteHeading") }}
        </h2>
        <p class="text-sb-ink-muted">
          {{ $t("account.profile.deleteText") }}
        </p>
        <SbButton variant="secondary" @click="open = true">{{
          $t("account.profile.deleteButton")
        }}</SbButton>
      </section>
      <SbConfirmDialog
        v-if="open"
        v-model:open="open"
        :title="$t('account.profile.deleteTitle')"
        :description="$t('account.profile.deleteDescription')"
        :confirm-label="$t('account.profile.deleteConfirm')"
        :loading="deleting"
        @confirm="onDelete"
      >
        <p v-if="deleteFailed" role="alert" class="text-sm font-semibold">
          {{ $t("account.profile.deleteFailed") }}
        </p>
      </SbConfirmDialog>
    </template>
  </div>
</template>
