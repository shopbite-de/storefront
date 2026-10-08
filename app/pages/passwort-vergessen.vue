<script setup lang="ts">
import * as z from "zod";

useHead({
  title: "Passwort vergessen",
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ],
});

const { apiClient } = useShopwareContext();

const schema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

async function sendRecoveryMail(email: string) {
  await apiClient.invoke("sendRecoveryMail post /account/recovery-password", {
    body: {
      email,
      storefrontUrl: useRuntimeConfig().public.storeUrl,
    },
  });
}

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
  <UserAuthPanel title="Passwort vergessen">
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
      @submit.prevent="onSubmit"
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
  </UserAuthPanel>
</template>
