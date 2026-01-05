<script setup lang="ts">
import type { AddressSchema } from "~/validation/registrationSchema";

const model = defineModel<AddressSchema>({ required: true });

const { validCities } = useValidCitiesForDelivery();

const cityOptions = computed(() =>
  validCities.value.map((city) => ({ label: city, value: city })),
);

defineProps<{
  prefix: string;
  accountType?: string;
  showNames?: boolean;
  isShipping?: boolean;
}>();
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

    <UFormField label="Postleitzahl" :name="`${prefix}.zipcode`" required>
      <UInput v-model="model.zipcode" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Ort" :name="`${prefix}.city`" required>
      <USelect
        v-if="isShipping && validCities.length > 0"
        v-model="model.city"
        :items="cityOptions"
        value-key="value"
        class="w-full"
      />
      <UInput v-else v-model="model.city" type="text" class="w-full" />
    </UFormField>

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
