<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useAddress } from "@shopware/composables";
import type { FormSubmitEvent } from "@nuxt/ui";

import { createAddressSchema } from "~/validation/addressSchema";
import type { AddressSchema } from "~/validation/addressSchema";

const props = defineProps<{
  address?: Schemas["CustomerAddress"] | undefined;
}>();

const config = useRuntimeConfig();
const { updateCustomerAddress, createCustomerAddress } = useAddress();

const state = reactive({
  id: props.address?.id,
  firstName: props.address?.firstName ?? undefined,
  lastName: props.address?.lastName ?? undefined,
  company: props.address?.company ?? undefined,
  department: props.address?.department ?? undefined,
  additionalAddressLine1: props.address?.additionalAddressLine1 ?? undefined,
  phoneNumber: props.address?.phoneNumber ?? undefined,
  street: props.address?.street ?? undefined,
  zipcode: props.address?.zipcode ?? undefined,
  city: props.address?.city ?? undefined,
  countryId: config.public.site.countryId,
});

const schema = computed(() => createAddressSchema(state));

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<AddressSchema>) {
  try {
    let response: undefined | Schemas["CustomerAddress"] = undefined;
    const addressData = event.data as unknown as Parameters<
      typeof updateCustomerAddress
    >[0];
    if (event.data.id) {
      response = await updateCustomerAddress(addressData);
    } else {
      response = await createCustomerAddress(addressData);
    }

    toast.add({
      title: "Erfolgreich gespeichert",
      color: "success",
    });
    emit("submit-success", response);
  } catch (error) {
    console.error("Address save failed:", error);
    toast.add({
      title: "Speichern fehlgeschlagen",
      description: "Bitte versuchen Sie es erneut.",
      color: "error",
    });
  }
}

const accountType = ref("privat");

const emit = defineEmits<{
  "submit-success": [data: Schemas["CustomerAddress"]];
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
