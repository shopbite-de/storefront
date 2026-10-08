<script setup lang="ts">
import * as z from "zod";
import type { Schemas } from "#shopware";
import { useAddress } from "@shopware/composables";
import {
  baseAddressSchema,
  type AddressSchema,
} from "~/validation/registrationSchema";

/**
 * Create or edit a customer address in the presets (#445): the address
 * fields of the checkout (`AddressFieldsPreset`), checked with the same
 * rules on submit. Errors show at the fields, the first one gets focus.
 */
const props = defineProps<{
  address?: Schemas["CustomerAddress"];
}>();

const emit = defineEmits<{
  "submit-success": [data: Schemas["CustomerAddress"]];
}>();

const { site } = useRuntimeConfig().public;
const { updateCustomerAddress, createCustomerAddress } = useAddress();

const isBusiness = ref(Boolean(props.address?.company));
const model = ref<AddressSchema>({
  firstName: props.address?.firstName ?? "",
  lastName: props.address?.lastName ?? "",
  company: props.address?.company ?? "",
  department: props.address?.department ?? "",
  street: props.address?.street ?? "",
  additionalAddressLine1: props.address?.additionalAddressLine1 ?? "",
  zipcode: props.address?.zipcode ?? "",
  city: props.address?.city ?? "",
  countryId: props.address?.countryId ?? site.countryId,
  phoneNumber: props.address?.phoneNumber ?? "",
});

const schema = computed(() =>
  baseAddressSchema
    .extend({
      firstName: z
        .string()
        .min(1, { message: "Bitte geben Sie den Vornamen an." }),
      lastName: z
        .string()
        .min(1, { message: "Bitte geben Sie den Nachnamen an." }),
      zipcode: z
        .string()
        .min(1, { message: "Bitte geben Sie die Postleitzahl an." }),
    })
    .refine((data) => !isBusiness.value || Boolean(data.company), {
      message: "Bitte geben Sie den Firmennamen an.",
      path: ["company"],
    }),
);

const PREFIX = "shippingAddress";
const errors = ref<Record<string, string>>({});
const saveError = ref(false);
const saving = ref(false);
const form = ref<HTMLFormElement | null>(null);

async function onSubmit() {
  saveError.value = false;
  const result = schema.value.safeParse(model.value);
  if (!result.success) {
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = `${PREFIX}.${issue.path.join(".")}`;
      next[key] ??= issue.message;
    }
    errors.value = next;
    await nextTick();
    form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  errors.value = {};
  saving.value = true;
  try {
    const data = {
      ...result.data,
      company: isBusiness.value ? result.data.company : "",
      department: isBusiness.value ? result.data.department : "",
    } as unknown as Parameters<typeof updateCustomerAddress>[0];
    const saved = props.address?.id
      ? await updateCustomerAddress({ ...data, id: props.address.id })
      : await createCustomerAddress(data);
    emit("submit-success", saved);
  } catch (error) {
    console.error("Address save failed:", error);
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form
    ref="form"
    novalidate
    class="flex flex-col gap-4 font-body text-sb-ink"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="saveError"
      role="alert"
      class="rounded-sb-control border-[1.5px] border-sb-danger p-4 text-sm"
    >
      <strong class="block"
        >Die Adresse konnte nicht gespeichert werden.</strong
      >
      Bitte versuchen Sie es noch einmal.
    </div>
    <SbCheckbox v-model="isBusiness" label="Firmenadresse" plain />
    <AddressFieldsPreset
      v-model="model"
      :prefix="PREFIX"
      :account-type="isBusiness ? 'business' : 'private'"
      show-names
      :errors="errors"
    />
    <SbButton type="submit" size="lg" block :loading="saving"
      >Adresse speichern</SbButton
    >
  </form>
</template>
