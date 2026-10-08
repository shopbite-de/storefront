<script setup lang="ts">
import { z } from "zod";

/**
 * Contact form of the presets (#445): the same call as Contact/Form.vue
 * (useContactForm), checked on submit with errors at the fields; the
 * first invalid field gets focus, the result shows in the page.
 */
const { send } = useContactForm();

const schema = contactFormSchema.extend({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  subject: z.string().min(3, "Bitte geben Sie einen Betreff an."),
  comment: z.string().min(10, "Die Nachricht braucht mindestens 10 Zeichen."),
});
type Field = keyof z.output<typeof schema>;

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
  const parsed = schema.safeParse(state);
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
    console.error("Error sending contact mail:", error);
    result.value = {
      ok: false,
      message:
        "Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später noch einmal.",
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
        <SbField v-slot="{ id, describedBy }" label="Vorname" optional>
          <SbInput
            :id="id"
            v-model="state.firstName"
            name="firstName"
            autocomplete="given-name"
            :aria-describedby="describedBy"
          />
        </SbField>
        <SbField v-slot="{ id, describedBy }" label="Nachname" optional>
          <SbInput
            :id="id"
            v-model="state.lastName"
            name="lastName"
            autocomplete="family-name"
            :aria-describedby="describedBy"
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
      <SbField v-slot="{ id, describedBy }" label="Telefon" optional>
        <SbInput
          :id="id"
          v-model="state.phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          :aria-describedby="describedBy"
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
