<script setup lang="ts">
import { createRegistrationSchema } from "~/validation/registrationSchema";
import type { RegistrationSchema } from "~/validation/registrationSchema";
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
  salutationId: undefined,
  firstName: undefined,
  lastName: undefined,
  email: undefined,
  guest: true,
  password: undefined,
  passwordConfirm: undefined,
  acceptedDataProtection: true,
  isShippingAddressDifferent: false,
  storefrontUrl: config.public.shopware.devStorefrontUrl,
  billingAddress: {
    company: undefined,
    department: undefined,
    salutationId: undefined,
    firstName: undefined,
    lastName: undefined,
    phoneNumber: undefined,
    street: undefined,
    zipcode: undefined,
    city: undefined,
    countryId: config.public.site.countryId,
  },
  shippingAddress: {
    company: undefined,
    department: undefined,
    salutationId: undefined,
    firstName: undefined,
    lastName: undefined,
    phoneNumber: undefined,
    street: undefined,
    zipcode: undefined,
    city: undefined,
    countryId: config.public.site.countryId,
  },
});

const schema = computed(() => createRegistrationSchema(state));

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<RegistrationSchema>) {
  const registrationData = { ...event.data };

  console.log(registrationData);
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

  try {
    await register(registrationData);

    toast.add({
      title: "Erfolgreich Kundendaten erfasst",
      color: "success",
    });
    emit("registration-success", registrationData);
  } catch (error) {
    console.error("Registration failed:", error);
    toast.add({
      title: "Registrierung fehlgeschlagen",
      description: "Bitte versuchen Sie es erneut.",
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
    value: "commercial",
  },
]);

const emit = defineEmits<{
  "registration-success": [data: RegistrationSchema];
}>();

const allowedCities = ref(["Obertshausen", "Lämmerspiel"]);
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit"
    @error="(error) => console.log('Form validation error:', error)"
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

    <UFormField label="Telefon" name="billingAddress.phoneNumber" required>
      <UInput
        v-model="state.billingAddress.phoneNumber"
        type="text"
        class="w-full"
      />
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

    <UFormField
      v-if="state.accountType === 'commercial'"
      label="Unternehmen"
      name="billingAddress.company"
    >
      <UInput
        v-model="state.billingAddress.company"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.accountType === 'commercial'"
      label="Abteilung"
      name="billingAddress.department"
    >
      <UInput
        v-model="state.billingAddress.department"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Straße und Hausnr."
      name="billingAddress.street"
      required
    >
      <UInput
        v-model="state.billingAddress.street"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Postleitzahl"
      name="billingAddress.zipcode"
    >
      <UInput
        v-model="state.billingAddress.zipcode"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Ort" name="billingAddress.city" required>
      <USelect
        v-if="!state.isShippingAddressDifferent"
        v-model="state.billingAddress.city"
        :items="allowedCities"
        class="w-full"
      />
      <UInput
        v-else
        v-model="state.billingAddress.city"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField name="guest">
      <UCheckbox
        v-model="state.isShippingAddressDifferent"
        label="Rechnungsadresse weicht von Lieferadresse ab"
        class="w-full"
      />
    </UFormField>

    <USeparator
      v-if="state.isShippingAddressDifferent"
      color="primary"
      label="Lieferadresse"
    />

    <UFormField
      v-if="
        state.accountType === 'commercial' && state.isShippingAddressDifferent
      "
      label="Unternehmen"
      name="shippingAddress.company"
    >
      <UInput
        v-model="state.shippingAddress.company"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="
        state.accountType === 'commercial' && state.isShippingAddressDifferent
      "
      label="Abteilung"
      name="billingAddress.department"
    >
      <UInput
        v-model="state.shippingAddress.department"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Vorname"
      name="shippingAddress.firstName"
      required
    >
      <UInput
        v-model="state.shippingAddress.firstName"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Nachname"
      name="shippingAddress.lastName"
    >
      <UInput
        v-model="state.shippingAddress.lastName"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Straße und Hausnr."
      name="shippingAddress.street"
    >
      <UInput
        v-model="state.shippingAddress.street"
        type="text"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Ort"
      name="shippingAddress.city"
    >
      <USelect
        v-model="state.shippingAddress.city"
        :items="allowedCities"
        class="w-full"
      />
    </UFormField>

    <UButton block type="submit">Speichern</UButton>
  </UForm>
</template>
