<script setup lang="ts">
import type { AddressSchema } from "~/validation/registrationSchema";

/**
 * Address fields of the presets (#443): the same model, autocomplete
 * check and correction as Address/Fields.vue, with the base components.
 * `errors` maps "<prefix>.<field>" to the message of the failed check;
 * every input carries its `autocomplete` token, so browsers can fill it.
 */
const model = defineModel<AddressSchema>({ required: true });

const props = defineProps<{
  prefix: string;
  accountType?: string;
  showNames?: boolean;
  errors?: Record<string, string>;
}>();

const { getSuggestions } = useAddressAutocomplete();
const {
  showCorrection,
  correction,
  checkAddress,
  flushPendingCheck,
  applyCorrection,
} = useAddressValidation(model, { getSuggestions });

defineExpose({ checkAddress, flushPendingCheck, showCorrection });

// The address group for autocomplete: "shipping" or "billing".
const section = computed(() =>
  props.prefix === "shippingAddress" ? "shipping" : "billing",
);
const fieldId = (name: string) => `${props.prefix}-${name}`;
const error = (name: string) => props.errors?.[`${props.prefix}.${name}`];
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
    <template v-if="accountType === 'business'">
      <SbField
        :id="fieldId('company')"
        v-slot="{ id, describedBy, invalid }"
        label="Unternehmen"
        :error="error('company')"
        class="sm:col-span-3"
      >
        <SbInput
          :id="id"
          v-model="model.company"
          :name="`${prefix}.company`"
          :autocomplete="`${section} organization`"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        :id="fieldId('department')"
        v-slot="{ id, describedBy, invalid }"
        label="Abteilung"
        optional
        :error="error('department')"
        class="sm:col-span-3"
      >
        <SbInput
          :id="id"
          v-model="model.department"
          :name="`${prefix}.department`"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
    </template>

    <template v-if="showNames">
      <SbField
        :id="fieldId('firstName')"
        v-slot="{ id, describedBy, invalid }"
        label="Vorname"
        :error="error('firstName')"
        class="sm:col-span-3"
      >
        <SbInput
          :id="id"
          v-model="model.firstName"
          :name="`${prefix}.firstName`"
          :autocomplete="`${section} given-name`"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
      <SbField
        :id="fieldId('lastName')"
        v-slot="{ id, describedBy, invalid }"
        label="Nachname"
        :error="error('lastName')"
        class="sm:col-span-3"
      >
        <SbInput
          :id="id"
          v-model="model.lastName"
          :name="`${prefix}.lastName`"
          :autocomplete="`${section} family-name`"
          :aria-describedby="describedBy"
          :invalid="invalid"
        />
      </SbField>
    </template>

    <SbField
      :id="fieldId('street')"
      v-slot="{ id, describedBy, invalid }"
      label="Straße und Hausnummer"
      :error="error('street')"
      class="sm:col-span-6"
    >
      <SbInput
        :id="id"
        v-model="model.street"
        :name="`${prefix}.street`"
        :autocomplete="`${section} address-line1`"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>

    <SbField
      :id="fieldId('zipcode')"
      v-slot="{ id, describedBy, invalid }"
      label="PLZ"
      :error="error('zipcode')"
      class="sm:col-span-2"
    >
      <SbInput
        :id="id"
        v-model="model.zipcode"
        :name="`${prefix}.zipcode`"
        inputmode="numeric"
        :autocomplete="`${section} postal-code`"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>
    <SbField
      :id="fieldId('city')"
      v-slot="{ id, describedBy, invalid }"
      label="Ort"
      :error="error('city')"
      class="sm:col-span-4"
    >
      <SbInput
        :id="id"
        v-model="model.city"
        :name="`${prefix}.city`"
        :autocomplete="`${section} address-level2`"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>

    <div
      v-if="showCorrection"
      role="status"
      class="flex flex-col gap-3 rounded-sb-control bg-sb-primary-tint p-4 font-body text-sb-ink sm:col-span-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Meinten Sie: <strong>{{ correction?.label }}</strong
        >?
      </span>
      <SbButton variant="secondary" @click="applyCorrection"
        >Übernehmen</SbButton
      >
    </div>

    <SbField
      :id="fieldId('additionalAddressLine1')"
      v-slot="{ id, describedBy, invalid }"
      label="Adresszusatz"
      hint="z. B. Hinterhaus, 2. Stock, Name am Klingelschild"
      optional
      :error="error('additionalAddressLine1')"
      class="sm:col-span-6"
    >
      <SbInput
        :id="id"
        v-model="model.additionalAddressLine1"
        :name="`${prefix}.additionalAddressLine1`"
        :autocomplete="`${section} address-line2`"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>

    <SbField
      :id="fieldId('phoneNumber')"
      v-slot="{ id, describedBy, invalid }"
      label="Telefon"
      hint="Nur für Rückfragen zur Bestellung"
      :error="error('phoneNumber')"
      class="sm:col-span-6"
    >
      <SbInput
        :id="id"
        v-model="model.phoneNumber"
        :name="`${prefix}.phoneNumber`"
        type="tel"
        :autocomplete="`${section} tel`"
        :aria-describedby="describedBy"
        :invalid="invalid"
      />
    </SbField>
  </div>
</template>
