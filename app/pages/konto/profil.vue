<script setup lang="ts">
import { useUser } from "@shopware/composables";
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "account",
});

useSeoMeta({
  title: "Profil",
});

const { apiClient } = useShopwareContext();
const loading = ref(true);
const { user, refreshUser, updatePersonalInfo, updateEmail, logout } =
  useUser();
const toast = useToast();
const open = ref(false);

const schema = z.object({
  email: z.string().email("Keine gültige Emailadresse"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
type Schema = z.output<typeof schema>;

function initializeFormState() {
  return reactive({
    email: user.value?.email,
    firstName: user.value?.firstName,
    lastName: user.value?.lastName,
  });
}

const state = initializeFormState();

async function handleEmailUpdate(newEmail: string) {
  if (newEmail !== user.value?.email) {
    await updateEmail({
      email: newEmail,
      emailConfirmation: newEmail,
      password: "",
    });
  }
}

async function handlePersonalInfoUpdate(firstName: string, lastName: string) {
  await updatePersonalInfo({
    firstName,
    lastName,
  });
}

function showSuccessMessage(message: string) {
  toast.add({
    title: message,
    color: "success",
  });
}

function showErrorMessage(title: string, description: string) {
  toast.add({
    title,
    description,
    icon: "i-lucide-x",
    color: "error" as const,
  });
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true;
    const eventData = event.data;

    await handleEmailUpdate(eventData.email);
    await handlePersonalInfoUpdate(eventData.firstName, eventData.lastName);
    await refreshUser();

    showSuccessMessage("Erfolgreich gespeichert");
  } catch (error) {
    console.error("Profile update error:", error);
    showErrorMessage("Fehler!", "Bitte versuchen Sie es später erneut.");
  } finally {
    loading.value = false;
  }
}

async function deleteCustomerAccount() {
  await apiClient.invoke("deleteCustomer delete /account/customer");
  toast.add({
    title: "Tschüss!",
    icon: "i-lucide-check",
    color: "success" as const,
  });
  await logout();
  navigateTo("/");
}

async function onDeleteProfile() {
  try {
    await deleteCustomerAccount();
  } catch (error) {
    console.error("Customer delete error:", error);
    showErrorMessage("Fehler!", "Bitte versuchen Sie es später erneut.");
  }
}

onMounted(async () => {
  await refreshUser();
  Object.assign(state, {
    email: user.value?.email,
    firstName: user.value?.firstName,
    lastName: user.value?.lastName,
  });
  loading.value = false;
});

// Presets (#445): validation, result and errors in the page, no toasts.
const { hasPreset } = useThemePreset();
const presetSchema = z.object({
  firstName: z.string().min(1, "Bitte geben Sie Ihren Vornamen an."),
  lastName: z.string().min(1, "Bitte geben Sie Ihren Nachnamen an."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
});
const errors = ref<Partial<Record<keyof Schema, string>>>({});
const saveResult = ref<"saved" | "failed" | null>(null);
const saving = ref(false);
const deleting = ref(false);
const deleteFailed = ref(false);
const resultBox = ref<HTMLElement | null>(null);
const form = ref<HTMLFormElement | null>(null);

async function onPresetSubmit() {
  saveResult.value = null;
  const parsed = presetSchema.safeParse(state);
  if (!parsed.success) {
    const next: typeof errors.value = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Schema;
      next[key] ??= issue.message;
    }
    errors.value = next;
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  errors.value = {};
  saving.value = true;
  try {
    await handleEmailUpdate(parsed.data.email);
    await handlePersonalInfoUpdate(parsed.data.firstName, parsed.data.lastName);
    await refreshUser();
    saveResult.value = "saved";
  } catch (error) {
    console.error("Profile update error:", error);
    saveResult.value = "failed";
  } finally {
    saving.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}

async function onPresetDelete() {
  deleting.value = true;
  deleteFailed.value = false;
  try {
    await apiClient.invoke("deleteCustomer delete /account/customer");
    await logout();
    open.value = false;
    navigateTo("/");
  } catch (error) {
    console.error("Customer delete error:", error);
    deleteFailed.value = true;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div v-if="hasPreset" class="font-body text-sb-ink">
    <UserAccountHeaderPreset title="Profil" />
    <p v-if="loading" role="status" class="text-sb-ink-muted">
      Profil wird geladen …
    </p>
    <template v-else>
      <form
        ref="form"
        novalidate
        class="flex max-w-xl flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
        @submit.prevent="onPresetSubmit"
      >
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
          <template v-if="saveResult === 'saved'"
            >Ihre Änderungen sind gespeichert.</template
          >
          <template v-else>
            <strong class="block">Speichern fehlgeschlagen.</strong>
            Bitte versuchen Sie es später noch einmal.
          </template>
        </div>
        <SbField
          v-slot="{ id, describedBy, invalid }"
          label="Vorname"
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
          label="Nachname"
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
          label="E-Mail"
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
        <SbButton type="submit" size="lg" :loading="saving" class="self-start"
          >Speichern</SbButton
        >
      </form>
      <section
        aria-labelledby="konto-loeschen"
        class="mt-10 flex max-w-xl flex-col items-start gap-3 border-t border-sb-line pt-6"
      >
        <h2 id="konto-loeschen" class="font-display text-xl">
          Kundenkonto löschen
        </h2>
        <p class="text-sb-ink-muted">
          Löscht Ihr Kundenkonto mit Adressen und Merkliste. Bestellungen
          bleiben für die gesetzliche Aufbewahrung gespeichert.
        </p>
        <SbButton variant="secondary" @click="open = true"
          >Konto löschen</SbButton
        >
      </section>
      <SbConfirmDialog
        v-if="open"
        v-model:open="open"
        title="Kundenkonto löschen?"
        description="Das lässt sich nicht rückgängig machen. Sie werden danach abgemeldet."
        confirm-label="Endgültig löschen"
        :loading="deleting"
        @confirm="onPresetDelete"
      >
        <p v-if="deleteFailed" role="alert" class="text-sm font-semibold">
          Das Konto konnte nicht gelöscht werden. Bitte versuchen Sie es später
          noch einmal.
        </p>
      </SbConfirmDialog>
    </template>
  </div>
  <UContainer v-else>
    <UPageHeader
      headline="KONTO"
      title="Mein Profil"
      description="Ändere hier deine prerönlichen Daten."
    />
    <UPageBody v-if="!loading">
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="(error) => console.log('Form validation error:', error)"
      >
        <UFormField label="Vorname" name="firstName">
          <UInput v-model="state.firstName" type="text" class="w-full" />
        </UFormField>
        <UFormField label="Nachname" name="lastName">
          <UInput v-model="state.lastName" type="text" class="w-full" />
        </UFormField>
        <UFormField label="Emailadresse" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>
        <div class="flex flex-row justify-between">
          <UButton label="Speichern" type="submit" />
          <UButton label="Konto löschen" color="error" @click="open = !open" />
        </div>
      </UForm>
      <UModal
        v-model:open="open"
        title="Konto löschen"
        description="Ihre Daten werden unwiederruflich gelöscht."
        :ui="{ footer: 'justify-end' }"
      >
        <template #body>
          <p>
            Löscht unwiederuflich ihr Kundenkonto zusammen mit Ihren Adressen,
            Merklisten und verknüpften Daten.
          </p>
        </template>
        <template #footer="{ close }">
          <UButton
            label="Abbrechen"
            color="neutral"
            variant="outline"
            @click="close"
          />
          <UButton label="Löschen" color="error" @click="onDeleteProfile" />
        </template>
      </UModal>
    </UPageBody>
  </UContainer>
</template>
