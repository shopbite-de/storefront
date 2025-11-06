<script setup lang="ts">
import { useUser } from "@shopware/composables";
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

definePageMeta({
  layout: "account",
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
    await updateEmail(newEmail);
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
  loading.value = false;
});
</script>

<template>
  <UContainer>
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
