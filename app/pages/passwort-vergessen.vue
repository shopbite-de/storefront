<script setup lang="ts">
import * as z from "zod";

const { t } = useI18n();

useHead({
  title: t("auth.passwordForgottenPage.title"),
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ],
});

// through the BFF (ADR 0001, step 6): the same answer whether the e-mail
// has an account or not
const { requestPasswordReset } = useCustomer();

const schema = z.object({
  email: z.string().email(),
});

const sendRecoveryMail = (email: string) => requestPasswordReset(email);

// Errors and the result show in the form (#445).
const email = ref("");
const emailError = ref<string>();
const result = ref<"sent" | "failed" | null>(null);
const sending = ref(false);
const resultBox = ref<HTMLElement | null>(null);

async function onSubmit() {
  result.value = null;
  const parsed = schema.safeParse({ email: email.value });
  if (!parsed.success) {
    emailError.value = t("auth.shared.emailInvalid");
    return;
  }
  emailError.value = undefined;
  sending.value = true;
  try {
    await sendRecoveryMail(parsed.data.email);
    result.value = "sent";
  } catch (error) {
    console.error("Password recovery error:", domainErrorCode(error));
    result.value = "failed";
  } finally {
    sending.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}
</script>
<template>
  <UserAuthPanel :title="$t('auth.passwordForgottenPage.title')">
    <template #intro>
      <p>{{ $t("auth.passwordForgottenPage.intro") }}</p>
    </template>
    <div
      v-if="result === 'sent'"
      ref="resultBox"
      role="status"
      tabindex="-1"
      class="flex flex-col gap-2"
    >
      <strong>{{ $t("auth.passwordForgottenPage.sentTitle") }}</strong>
      <p>{{ $t("auth.passwordForgottenPage.sentText") }}</p>
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
          $t("auth.passwordForgottenPage.failedTitle")
        }}</strong>
        {{ $t("auth.passwordForgottenPage.failedText") }}
      </div>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        :label="$t('auth.shared.emailLabel')"
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
      <SbButton type="submit" size="lg" block :loading="sending">{{
        $t("auth.passwordForgottenPage.submit")
      }}</SbButton>
    </form>
    <template #footer>
      <NuxtLink
        :to="{ name: 'anmelden' }"
        class="font-semibold text-sb-primary-ink underline underline-offset-4"
        >{{ $t("auth.passwordForgottenPage.backToLogin") }}</NuxtLink
      >
    </template>
  </UserAuthPanel>
</template>
