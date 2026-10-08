<script setup lang="ts">
import { useUser } from "@shopware/composables";
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
const open = ref(false);

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

onMounted(async () => {
  await refreshUser();
  Object.assign(state, {
    email: user.value?.email,
    firstName: user.value?.firstName,
    lastName: user.value?.lastName,
  });
  loading.value = false;
});

// Validation, result and errors in the page (#445).
const schema = z.object({
  firstName: z.string().min(1, "Bitte geben Sie Ihren Vornamen an."),
  lastName: z.string().min(1, "Bitte geben Sie Ihren Nachnamen an."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
});
type Schema = z.output<typeof schema>;
const errors = ref<Partial<Record<keyof Schema, string>>>({});
const saveResult = ref<"saved" | "failed" | null>(null);
const saving = ref(false);
const deleting = ref(false);
const deleteFailed = ref(false);
const resultBox = ref<HTMLElement | null>(null);
const form = ref<HTMLFormElement | null>(null);

async function onSubmit() {
  saveResult.value = null;
  const parsed = schema.safeParse(state);
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

async function onDelete() {
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
  <div class="font-body text-sb-ink">
    <UserAccountHeader title="Profil" />
    <p v-if="loading" role="status" class="text-sb-ink-muted">
      Profil wird geladen …
    </p>
    <template v-else>
      <form
        ref="form"
        novalidate
        class="flex max-w-xl flex-col gap-4 rounded-sb-card border border-sb-line bg-sb-surface p-6"
        @submit.prevent="onSubmit"
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
        @confirm="onDelete"
      >
        <p v-if="deleteFailed" role="alert" class="text-sm font-semibold">
          Das Konto konnte nicht gelöscht werden. Bitte versuchen Sie es später
          noch einmal.
        </p>
      </SbConfirmDialog>
    </template>
  </div>
</template>
