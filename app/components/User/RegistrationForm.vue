<script setup lang="ts">
import { createRegistrationSchema } from "~/validation/registrationSchema";
import type { RegistrationSchema } from "~/validation/registrationSchema";
import { ApiClientError } from "@shopware/api-client";
import type { FormSubmitEvent } from "@nuxt/ui";

const config = useRuntimeConfig();
const { register, isLoggedIn } = useUser();

if (import.meta.client && isLoggedIn.value) {
  navigateTo({ path: "/konto" });
}

watch(isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    navigateTo({ path: "/konto" });
  }
});

const state = reactive({
  accountType: "private",
  salutationId: "",
  firstName: "",
  lastName: "",
  email: "",
  guest: true,
  password: "",
  passwordConfirm: "",
  acceptedDataProtection: false,
  isShippingAddressDifferent: false,
  storefrontUrl: config.public.shopware.devStorefrontUrl,
  billingAddress: {
    company: "",
    department: "",
    salutationId: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    additionalAddressLine1: "",
    street: "",
    zipcode: "",
    city: "",
    countryId: config.public.site.countryId,
  },
  shippingAddress: {
    company: "",
    department: "",
    salutationId: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    additionalAddressLine1: "",
    street: "",
    zipcode: "",
    city: "",
    countryId: config.public.site.countryId,
  },
});

const schema = computed(() => createRegistrationSchema(state));

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<RegistrationSchema>) {
  const registrationData = { ...event.data };

  if (
    !registrationData.billingAddress.firstName &&
    registrationData.firstName
  ) {
    registrationData.billingAddress.firstName = registrationData.firstName;
  }

  if (!registrationData.billingAddress.lastName && registrationData.lastName) {
    registrationData.billingAddress.lastName = registrationData.lastName;
  }

  if (!state.isShippingAddressDifferent) {
    delete registrationData.shippingAddress;
  }

  if (registrationData.guest) {
    delete registrationData.password;
    delete registrationData.passwordConfirm;
  }

  try {
    // @ts-expect-error - password is required in the API type but not for guests
    await register(registrationData);

    toast.add({
      title: "Erfolgreich Kundendaten erfasst",
      color: "success",
    });
    emit("registration-success", registrationData);
  } catch (error) {
    console.error("Registration failed:", error);
    let description = "Bitte versuchen Sie es erneut.";
    if (error instanceof ApiClientError) {
      const errors = error.details?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        description = errors
          .map((e) => e.detail || e.title)
          .filter(Boolean)
          .join("\n");
      }
    }
    toast.add({
      title: "Registrierung fehlgeschlagen",
      description,
      color: "error",
    });
  }
}

const accountTypes = ref([
  {
    label: "Privatkunde",
    value: "private",
  },
  {
    label: "Geschäftskunde",
    value: "business",
  },
]);

const emit = defineEmits<{
  "registration-success": [data: RegistrationSchema];
}>();
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    @error="(error: any) => console.log('Form validation error:', error)"
  >
    <UFormField name="accountType">
      <USelect
        v-model="state.accountType"
        value-key="value"
        :items="accountTypes"
        class="w-full"
      />
    </UFormField>

    <UFormField name="guest">
      <USwitch
        v-model="state.guest"
        label="Als Gast bestellen"
        class="w-full"
      />
    </UFormField>

    <div class="flex flex-row justify-between gap-4">
      <UFormField label="Vorname" name="firstName" required class="w-full">
        <UInput v-model="state.firstName" type="text" class="w-full" />
      </UFormField>

      <UFormField label="Nachname" name="lastName" required class="w-full">
        <UInput v-model="state.lastName" type="text" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Email" name="email" required>
      <UInput v-model="state.email" class="w-full" />
    </UFormField>

    <UFormField v-if="!state.guest" label="Password" name="password">
      <UInput v-model="state.password" type="password" class="w-full" />
    </UFormField>

    <UFormField
      v-if="!state.guest"
      label="Password wiederholen"
      name="passwordConfirm"
    >
      <UInput v-model="state.passwordConfirm" type="password" class="w-full" />
    </UFormField>

    <USeparator
      color="primary"
      :label="
        state.isShippingAddressDifferent
          ? 'Rechnungsadresse'
          : 'Rechnungs- und Lieferadresse'
      "
    />

    <AddressFields
      v-model="state.billingAddress"
      prefix="billingAddress"
      :account-type="state.accountType"
    />

    <UFormField name="isShippingAddressDifferent">
      <UCheckbox
        v-model="state.isShippingAddressDifferent"
        label="Rechnungsadresse weicht von Lieferadresse ab"
        class="w-full"
      />
    </UFormField>

    <template v-if="state.isShippingAddressDifferent">
      <USeparator color="primary" label="Lieferadresse" />

      <AddressFields
        v-model="state.shippingAddress"
        prefix="shippingAddress"
        :account-type="state.accountType"
        show-names
        is-shipping
      />
    </template>

    <UFormField name="acceptedDataProtection">
      <UCheckbox v-model="state.acceptedDataProtection" class="w-full">
        <template #label>
          <span>
            Ich habe die
            <ULink to="/unternehmen/datenschutz">
              Datenschutzbestimmungen
            </ULink>
            gelesen und akzeptiere diese.
          </span>
        </template>
      </UCheckbox>
    </UFormField>

    <UButton block type="submit">Speichern</UButton>
  </UForm>
</template>
