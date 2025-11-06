<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useAddress } from "@shopware/composables";
import type { FormSubmitEvent } from "@nuxt/ui";

import { createAddressSchema } from "~/validation/addressSchema";
import type { AddressSchema } from "~/validation/addressSchema";

const props = defineProps<{
  address?: Schemas["CustomerAddress"] | undefined;
}>();

const { address } = toRefs(props);

const { updateCustomerAddress, createCustomerAddress } = useAddress();

const state = reactive({
  id: address.value.id,
  accountType: "privat",
  firstName: address.value.firstName ?? undefined,
  lastName: address.value.lastName ?? undefined,
  company: address.value.company ?? undefined,
  department: address.value.department ?? undefined,
  additionalAddressLine1: address.value.additionalAddressLine1 ?? undefined,
  phoneNumber: address.value.phoneNumber ?? undefined,
  street: address.value.street ?? undefined,
  zipcode: address.value.zipcode ?? undefined,
  city: address.value.city ?? undefined,
  countryId: "018d9f162ade709b9ccc92929b44d236",
});

const schema = computed(() => createAddressSchema(state));

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<AddressSchema>) {
  if (event.data.id) {
    await updateCustomerAddress(event.data);
  } else {
    await createCustomerAddress(event.data);
  }

  toast.add({
    title: "Erfolgreich gespeichert",
    color: "success",
  });
  emit("submit-success", event.data);
}

const accountType = ref("privat");

const emit = defineEmits<{
  "submit-success": [data: AddressSchema];
}>();
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    @error="(error) => console.log('Form validation error:', error)"
  >
    <UInput v-model="state.id" type="text" hidden />

    <UFormField label="Vorname" name="firstName">
      <UInput v-model="state.firstName" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Nachname" name="lastName">
      <UInput v-model="state.lastName" type="text" class="w-full" />
    </UFormField>

    <UFormField
      v-if="accountType === 'commercial'"
      label="Unternehmen"
      name="company"
    >
      <UInput v-model="state.company" type="text" class="w-full" />
    </UFormField>

    <UFormField
      v-if="accountType === 'commercial'"
      label="Abteilung"
      name="department"
    >
      <UInput v-model="state.department" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Straße und Hausnr." name="street">
      <UInput v-model="state.street" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Zusatz" name="additionalAddressLine1">
      <UInput
        v-model="state.additionalAddressLine1"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Postleitzahl" name="zipcode">
      <UInput v-model="state.zipcode" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Ort" name="city">
      <UInput v-model="state.city" type="text" class="w-full" />
    </UFormField>

    <UFormField label="Telefon" name="phoneNumber">
      <UInput v-model="state.phoneNumber" type="phone" class="w-full" />
    </UFormField>

    <UButton type="submit" block label="Speichern" />
  </UForm>
</template>
