<script setup lang="ts">
import type { AddressSchema } from "~/validation/registrationSchema";

const model = defineModel<AddressSchema>({ required: true });

const props = defineProps<{
  prefix: string;
  accountType?: string;
  showNames?: boolean;
  isShipping?: boolean;
}>();

const { getSuggestions } = useAddressAutocomplete();
const { validCities } = useValidCitiesForDelivery();

const {
  showCorrection,
  correction,
  isInvalidCity,
  checkAddress,
  applyCorrection,
} = useAddressValidation(model, {
  isShipping: props.isShipping,
  getSuggestions,
  validCities,
});

defineExpose({
  checkAddress,
  showCorrection,
});
</script>

<template>
  <div class="space-y-4">
    <UFormField
      v-if="accountType === 'business'"
      label="Unternehmen"
      :name="`${prefix}.company`"
    >
      <UInput v-model="model.company" type="text" class="w-full" />
    </UFormField>

    <UFormField
      v-if="accountType === 'business'"
      label="Abteilung"
      :name="`${prefix}.department`"
    >
      <UInput v-model="model.department" type="text" class="w-full" />
    </UFormField>

    <div v-if="showNames" class="flex flex-row justify-between gap-4">
      <UFormField
        label="Vorname"
        :name="`${prefix}.firstName`"
        required
        class="w-full"
      >
        <UInput v-model="model.firstName" type="text" class="w-full" />
      </UFormField>

      <UFormField
        label="Nachname"
        :name="`${prefix}.lastName`"
        required
        class="w-full"
      >
        <UInput v-model="model.lastName" type="text" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Straße und Hausnr." :name="`${prefix}.street`" required>
      <UInput v-model="model.street" type="text" class="w-full" />
    </UFormField>

    <div class="flex flex-row gap-4">
      <UFormField label="PLZ" :name="`${prefix}.zipcode`" class="w-24">
        <UInput v-model="model.zipcode" type="text" class="w-full" />
      </UFormField>

      <UFormField label="Ort" :name="`${prefix}.city`" required class="flex-1">
        <UInput v-model="model.city" type="text" class="w-full" />
      </UFormField>
    </div>

    <div v-if="showCorrection" class="flex flex-col items-center gap-2">
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        :title="`Meinten Sie: ${correction?.label}?`"
        class="flex-1"
      />
      <UButton
        label="Korrigieren"
        color="info"
        variant="solid"
        size="sm"
        block
        @click="applyCorrection"
      />
    </div>

    <UAlert
      v-if="isInvalidCity"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
    >
      <template #title>
        An diese Adresse können wir leider nicht liefern.
        <ULink to="/unternehmen/zahlung-und-versand">Weitere Infos.</ULink>
      </template>
    </UAlert>

    <UFormField label="Adresszusatz" :name="`${prefix}.additionalAddressLine1`">
      <UInput
        v-model="model.additionalAddressLine1"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Telefon" :name="`${prefix}.phoneNumber`" required>
      <UInput v-model="model.phoneNumber" type="text" class="w-full" />
    </UFormField>
  </div>
</template>
