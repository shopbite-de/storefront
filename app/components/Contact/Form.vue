<script setup lang="ts">
import { z } from "zod";
import type { ContactForm } from "../../../shared/domain";

/**
 * Contact form of the presets (#445): the same call as Contact/Form.vue
 * (useContactForm), checked on submit with errors at the fields; the
 * first invalid field gets focus, the result shows in the page.
 */
const { send } = useContactForm();

// the fields the restaurant requires beside e-mail, subject and message
const { data: formSettings } = await useFetch<ContactForm>(
  "/api/contact/form",
  {
    key: "contact-form",
    default: () => ({
      required: { firstName: false, lastName: false, phone: false },
    }),
  },
);
const required = computed(
  () =>
    formSettings.value?.required ?? {
      firstName: false,
      lastName: false,
      phone: false,
    },
);

const MESSAGES = {
  firstName: "Bitte geben Sie Ihren Vornamen an.",
  lastName: "Bitte geben Sie Ihren Nachnamen an.",
  phone: "Bitte geben Sie Ihre Telefonnummer an.",
  email: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  subject: "Bitte geben Sie einen Betreff an.",
  comment: "Die Nachricht braucht mindestens 10 Zeichen.",
} as const;

const requiredText = (field: keyof typeof MESSAGES, needed: boolean) =>
  needed ? z.string().trim().min(1, MESSAGES[field]) : z.string().optional();

const schema = computed(() =>
  contactFormSchema.extend({
    firstName: requiredText("firstName", required.value.firstName),
    lastName: requiredText("lastName", required.value.lastName),
    phone: requiredText("phone", required.value.phone),
    email: z.string().email(MESSAGES.email),
    subject: z
      .string()
      .refine((value) => value.trim().length >= 3, MESSAGES.subject),
    comment: z
      .string()
      .refine((value) => value.trim().length >= 10, MESSAGES.comment),
  }),
);
type Field = keyof z.output<typeof contactFormSchema>;

/** A field the server named (the domain's `message` is the form's comment). */
const FORM_FIELDS: Record<string, Field> = {
  firstName: "firstName",
  lastName: "lastName",
  phone: "phone",
  email: "email",
  subject: "subject",
  message: "comment",
};

const empty = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  comment: "",
  hp: "",
});
const state = reactive(empty());
const errors = ref<Partial<Record<Field, string>>>({});
const sending = ref(false);
const result = ref<{ ok: boolean; message: string } | null>(null);
const form = ref<HTMLFormElement | null>(null);
const resultBox = ref<HTMLElement | null>(null);

async function onSubmit() {
  result.value = null;
  const parsed = schema.value.safeParse(state);
  if (!parsed.success) {
    const next: typeof errors.value = {};
    for (const issue of parsed.error.issues) {
      next[issue.path[0] as Field] ??= issue.message;
    }
    errors.value = next;
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  errors.value = {};
  sending.value = true;
  try {
    const message = await send(
      parsed.data,
      "Vielen Dank, Ihre Nachricht ist bei uns angekommen.",
    );
    result.value = { ok: true, message };
    Object.assign(state, empty());
  } catch (error) {
    // the code only: the error of a request carries its body
    console.error("[contact] send", domainErrorCode(error) ?? "no answer");
    // fields the server or the restaurant refused: said at the fields
    const details = domainErrorDetails(error);
    const named = [
      ...(typeof details.field === "string" ? [details.field] : []),
      ...(Array.isArray(details.fields) ? (details.fields as string[]) : []),
    ].flatMap((name) => (FORM_FIELDS[name] ? [FORM_FIELDS[name]] : []));
    if (named.length) {
      const next: typeof errors.value = {};
      for (const field of named) {
        if (field !== "hp") next[field] = MESSAGES[field];
      }
      errors.value = next;
    }
    result.value = {
      ok: false,
      message: named.length
        ? "Bitte prüfen Sie die markierten Angaben."
        : "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später noch einmal.",
    };
  } finally {
    sending.value = false;
  }
  await nextTick();
  resultBox.value?.focus();
}
</script>

<template>
  <div class="flex flex-col gap-4 font-body text-sb-ink">
    <div
      v-if="result?.ok"
      ref="resultBox"
      role="status"
      tabindex="-1"
      class="flex flex-col items-start gap-4 rounded-sb-card bg-sb-primary-tint p-6 text-sb-primary-ink"
    >
      <p class="font-semibold">{{ result.message }}</p>
      <SbButton variant="secondary" @click="result = null"
        >Weitere Nachricht schreiben</SbButton
      >
    </div>
    <form
      v-else
      ref="form"
      novalidate
      class="relative flex flex-col gap-4"
      @submit.prevent="onSubmit"
    >
      <p
        v-if="result"
        ref="resultBox"
        role="alert"
        tabindex="-1"
        class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
      >
        {{ result.message }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <SbField
          v-slot="{ id, describedBy, invalid }"
          label="Vorname"
          :optional="!required.firstName"
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
          :optional="!required.lastName"
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
      </div>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="E-Mail"
        hint="Für unsere Antwort"
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
        v-slot="{ id, describedBy, invalid }"
        label="Telefon"
        :optional="!required.phone"
        :error="errors.phone"
      >
        <SbInput
          :id="id"
          v-model="state.phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="Betreff"
        :error="errors.subject"
      >
        <SbInput
          :id="id"
          v-model="state.subject"
          name="subject"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        v-slot="{ id, describedBy, invalid }"
        label="Nachricht"
        :error="errors.comment"
      >
        <textarea
          :id="id"
          v-model="state.comment"
          name="comment"
          rows="6"
          :aria-describedby="describedBy"
          :aria-invalid="invalid || undefined"
          class="w-full rounded-sb-control border-[1.5px] border-sb-control bg-sb-surface px-3.5 py-3 font-body text-base text-sb-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-sb-focus aria-invalid:border-sb-danger"
        />
      </SbField>
      <!-- honeypot: hidden from people and assistive technology -->
      <div class="absolute size-0 overflow-hidden opacity-0" aria-hidden="true">
        <label>
          Adresse
          <input
            v-model="state.hp"
            name="hp"
            type="text"
            tabindex="-1"
            autocomplete="off"
          />
        </label>
      </div>
      <SbButton type="submit" size="lg" :loading="sending" class="self-start"
        >Nachricht senden</SbButton
      >
    </form>
  </div>
</template>
