<script setup lang="ts">
import type { RegistrationSchema } from "~/validation/registrationSchema";
import type { Schemas } from "#shopware";

/**
 * Registration and guest order form of the presets (#443): the logic of
 * useRegistrationForm with the base components. The schema is checked on
 * submit; errors appear at their fields and in a summary above the form
 * that takes the focus and links to each field (WCAG 3.3.1).
 */
const props = withDefaults(defineProps<{ allowGuest?: boolean }>(), {
  allowGuest: true,
});

const emit = defineEmits<{
  "registration-success": [
    data: RegistrationSchema,
    customer: Schemas["Customer"] | undefined,
  ];
}>();

const {
  state,
  schema,
  createAccount,
  billingAddressFields,
  shippingAddressFields,
  accountTypes,
  submit,
} = useRegistrationForm({ allowGuest: props.allowGuest });

const errors = ref<Record<string, string>>({});
const submitError = ref<string | null>(null);
const notice = ref<string | null>(null);
const submitting = ref(false);
const summary = ref<HTMLElement | null>(null);

// Field ids follow the schema paths ("billingAddress.street" →
// "billingAddress-street"), so the summary can link to them.
const fieldId = (path: string) => path.replace(/\./g, "-");
// The summary lists the errors in the order of the form, not the schema.
const ADDRESS_ORDER = [
  "company",
  "department",
  "firstName",
  "lastName",
  "street",
  "zipcode",
  "city",
  "additionalAddressLine1",
  "phoneNumber",
];
const FIELD_ORDER = [
  "accountType",
  "firstName",
  "lastName",
  "email",
  "password",
  "passwordConfirm",
  ...ADDRESS_ORDER.map((name) => `billingAddress.${name}`),
  ...ADDRESS_ORDER.map((name) => `shippingAddress.${name}`),
  "acceptedDataProtection",
];
const position = (path: string) => {
  const index = FIELD_ORDER.indexOf(path);
  return index === -1 ? FIELD_ORDER.length : index;
};
const errorList = computed(() =>
  Object.entries(errors.value)
    .map(([path, message]) => ({ path, message, id: fieldId(path) }))
    .sort((a, b) => position(a.path) - position(b.path)),
);

async function onSubmit() {
  submitError.value = null;
  notice.value = null;
  const result = schema.value.safeParse(state);
  if (!result.success) {
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!next[path]) next[path] = issue.message;
    }
    errors.value = next;
    await nextTick();
    summary.value?.focus();
    return;
  }
  errors.value = {};
  submitting.value = true;
  try {
    const outcome = await submit(result.data as RegistrationSchema);
    if (!outcome.ok) {
      submitError.value = outcome.message;
      await nextTick();
      summary.value?.focus();
      return;
    }
    if (outcome.needsConfirmation) {
      notice.value =
        "Fast geschafft: Wir haben Ihnen eine E-Mail geschickt. Bitte bestätigen Sie den Link darin, um Ihr Konto zu aktivieren.";
    }
    emit("registration-success", outcome.data, outcome.customer);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form
    novalidate
    class="flex flex-col gap-5 font-body text-sb-ink"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="errorList.length || submitError"
      ref="summary"
      role="alert"
      tabindex="-1"
      class="flex flex-col gap-2 rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
    >
      <strong class="text-base">
        {{
          submitError
            ? "Das hat nicht geklappt"
            : errorList.length === 1
              ? "Ein Feld braucht noch Ihre Angabe"
              : `${errorList.length} Felder brauchen noch Ihre Angabe`
        }}
      </strong>
      <p v-if="submitError" class="whitespace-pre-line">{{ submitError }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="item in errorList" :key="item.path">
          <a
            :href="`#${item.id}`"
            class="font-semibold text-sb-danger underline underline-offset-2"
            >{{ item.message }}</a
          >
        </li>
      </ul>
    </div>
    <p
      v-if="notice"
      role="status"
      class="rounded-sb-control bg-sb-primary-tint p-4 text-sm"
    >
      {{ notice }}
    </p>

    <SbSegmentedControl
      v-model="state.accountType"
      label="Kundenart"
      :options="accountTypes"
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SbField
        id="firstName"
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
        id="lastName"
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
    </div>

    <SbField
      id="email"
      v-slot="{ id, describedBy, invalid }"
      label="E-Mail"
      hint="Für die Bestellbestätigung"
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

    <SbCheckbox
      v-if="allowGuest"
      v-model="createAccount"
      label="Kundenkonto anlegen"
      description="Für schnellere Bestellungen mit gespeicherten Adressen"
      plain
    />

    <div v-if="!state.guest" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SbField
        id="password"
        v-slot="{ id, describedBy, invalid }"
        label="Passwort"
        hint="Mindestens 8 Zeichen"
        :error="errors.password"
      >
        <SbInput
          :id="id"
          v-model="state.password"
          name="password"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        id="passwordConfirm"
        v-slot="{ id, describedBy, invalid }"
        label="Passwort wiederholen"
        :error="errors.passwordConfirm"
      >
        <SbInput
          :id="id"
          v-model="state.passwordConfirm"
          name="passwordConfirm"
          type="password"
          autocomplete="new-password"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
    </div>

    <fieldset class="flex flex-col gap-4 border-t border-sb-line pt-5">
      <legend class="mb-1 font-bold">
        {{
          state.isShippingAddressDifferent
            ? "Rechnungsadresse"
            : "Rechnungs- und Lieferadresse"
        }}
      </legend>
      <AddressFieldsPreset
        ref="billingAddressFields"
        v-model="state.billingAddress"
        prefix="billingAddress"
        :account-type="state.accountType"
        :errors="errors"
      />
    </fieldset>

    <SbCheckbox
      v-model="state.isShippingAddressDifferent"
      label="Lieferadresse weicht von der Rechnungsadresse ab"
      plain
    />

    <fieldset
      v-if="state.isShippingAddressDifferent"
      class="flex flex-col gap-4 border-t border-sb-line pt-5"
    >
      <legend class="mb-1 font-bold">Lieferadresse</legend>
      <AddressFieldsPreset
        ref="shippingAddressFields"
        v-model="state.shippingAddress"
        prefix="shippingAddress"
        :account-type="state.accountType"
        :errors="errors"
        show-names
      />
    </fieldset>

    <div class="flex flex-col gap-1">
      <SbCheckbox
        id="acceptedDataProtection"
        v-model="state.acceptedDataProtection"
        label="Datenschutzerklärung"
        plain
        :invalid="!!errors.acceptedDataProtection"
        :described-by="
          errors.acceptedDataProtection
            ? 'acceptedDataProtection-error'
            : undefined
        "
      >
        Ich habe die
        <NuxtLink
          to="/datenschutz"
          class="font-semibold text-sb-primary-ink underline underline-offset-2"
          >Datenschutzerklärung</NuxtLink
        >
        gelesen und akzeptiere sie.
      </SbCheckbox>
      <p
        v-if="errors.acceptedDataProtection"
        id="acceptedDataProtection-error"
        class="text-sm font-semibold text-sb-danger"
      >
        {{ errors.acceptedDataProtection }}
      </p>
    </div>

    <SbButton type="submit" size="lg" block :loading="submitting">
      Angaben speichern
    </SbButton>
  </form>
</template>
