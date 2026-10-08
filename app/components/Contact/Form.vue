<script setup lang="ts">
import type { FormSubmitEvent } from "#ui/types";
import type { ContactFormData } from "~/composables/useContactForm";

const { hasPreset } = useThemePreset();
const { salutations, send } = useContactForm();
const schema = contactFormSchema;
const toast = useToast();

const state = reactive({
  salutationId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  comment: "",
  hp: "",
});

const loading = ref(false);
const submitted = ref(false);
const successMessage = ref("");

async function onSubmit(event: FormSubmitEvent<ContactFormData>) {
  loading.value = true;
  try {
    successMessage.value = await send(
      event.data,
      "Deine Nachricht wurde erfolgreich versendet.",
    );
    submitted.value = true;

    toast.add({
      title: "Erfolg!",
      description: successMessage.value,
      color: "success",
    });

    // Reset form
    state.salutationId = "";
    state.firstName = "";
    state.lastName = "";
    state.email = "";
    state.phone = "";
    state.subject = "";
    state.comment = "";
    state.hp = "";
  } catch (error) {
    console.error("Error sending contact mail:", error);
    toast.add({
      title: "Fehler!",
      description:
        "Deine Nachricht konnte nicht versendet werden. Bitte versuche es später erneut.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ContactFormPreset v-if="hasPreset" />
  <div v-else-if="submitted" class="space-y-4 text-center">
    <UAlert
      color="success"
      variant="soft"
      icon="i-lucide-check-circle"
      :title="successMessage"
    />
    <UButton variant="link" @click="submitted = false">
      Weiteres Formular senden
    </UButton>
  </div>

  <UForm
    v-else
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
  >
    <UFormField label="Anrede" name="salutationId">
      <USelect
        v-model="state.salutationId"
        :items="salutations"
        placeholder="Bitte wählen"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UFormField label="Vorname" name="firstName">
        <UInput
          v-model="state.firstName"
          placeholder="Dein Vorname"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Nachname" name="lastName">
        <UInput
          v-model="state.lastName"
          placeholder="Dein Nachname"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField label="E-Mail" name="email" required>
      <UInput
        v-model="state.email"
        type="email"
        placeholder="Deine E-Mail-Adresse"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Telefon" name="phone">
      <UInput
        v-model="state.phone"
        type="tel"
        placeholder="Deine Telefonnummer"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Betreff" name="subject" required>
      <UInput
        v-model="state.subject"
        placeholder="Worum geht es?"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Nachricht" name="comment" required>
      <UTextarea
        v-model="state.comment"
        placeholder="Wie können wir dir helfen?"
        class="w-full"
      />
    </UFormField>

    <!-- Honeypot field -->
    <div class="hidden-field" aria-hidden="true">
      <UFormField label="Address" name="hp">
        <UInput
          v-model="state.hp"
          type="text"
          placeholder="Address"
          tabindex="-1"
          autocomplete="off"
        />
      </UFormField>
    </div>

    <UButton type="submit" :loading="loading" block> Absenden </UButton>
  </UForm>
</template>

<style scoped>
.hidden-field {
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
  height: 0;
  width: 0;
  z-index: -1;
  overflow: hidden;
}
</style>
