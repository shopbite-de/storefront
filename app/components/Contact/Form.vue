<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import { useSalutations } from "@shopware/composables";

const { apiClient } = useShopwareContext();
const { getSalutations } = useSalutations();
const toast = useToast();

const salutations = computed(() =>
  getSalutations.value.map((salutation) => ({
    label: salutation.displayName,
    value: salutation.id,
  })),
);

const schema = z.object({
  salutationId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Bitte gib einen Betreff an"),
  comment: z
    .string()
    .min(10, "Die Nachricht muss mindestens 10 Zeichen lang sein"),
  hp: z.string().optional(),
});

type Schema = z.output<typeof schema>;

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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (event.data.hp) {
    console.warn("Honeypot filled, submission ignored.");
    successMessage.value = "Deine Nachricht wurde erfolgreich versendet.";
    submitted.value = true;
    return;
  }
  loading.value = true;
  const salutation = event.data.salutationId || salutations.value.at(-1)?.value;
  try {
    const result = await apiClient.invoke(
      "sendContactMail post /contact-form",
      {
        body: {
          salutationId: salutation,
          firstName: event.data.firstName,
          lastName: event.data.lastName,
          email: event.data.email,
          phone: event.data.phone,
          subject: event.data.subject,
          comment: event.data.comment,
        },
      },
    );

    const resultData = result?.data as Record<string, unknown> | undefined;
    const msg =
      typeof resultData?.individualSuccessMessage === "string"
        ? (resultData.individualSuccessMessage as string).trim()
        : "";
    successMessage.value =
      msg && msg.length > 0
        ? msg
        : "Deine Nachricht wurde erfolgreich versendet.";
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
  <div v-if="submitted" class="space-y-4 text-center">
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
