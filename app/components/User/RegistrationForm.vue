<script setup lang="ts">
import { createRegistrationSchema } from "~/validation/registrationSchema";
import type { RegistrationSchema } from "~/validation/registrationSchema";
import { ApiClientError } from "@shopware/api-client";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const props = withDefaults(
  defineProps<{
    /**
     * Whether the visitor may skip the customer account (guest order). The
     * registration page (`/registrierung`) always creates a real account, the
     * checkout offers the choice.
     */
    allowGuest?: boolean;
  }>(),
  {
    allowGuest: true,
  },
);

const config = useRuntimeConfig();
// Where to go after a successful registration is the caller's decision: the
// registration page sends the visitor to the account, the checkout continues
// with the order.
const { register } = useUser();

const state = reactive({
  accountType: "private" as "private" | "business",
  salutationId: "",
  firstName: "",
  lastName: "",
  email: "",
  guest: props.allowGuest,
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

// The API payload keeps the negated `guest` flag, the form asks the positive
// question: a guest order is the default, creating an account is the opt-in.
const createAccount = computed({
  get: () => !state.guest,
  set: (value: boolean) => {
    state.guest = !value;
  },
});

/**
 * With double opt-in enabled in Shopware the customer stays inactive until the
 * confirmation link is clicked, so there is no session to continue with.
 */
function needsEmailConfirmation(customer: Schemas["Customer"] | undefined) {
  return !!customer?.doubleOptInRegistration && !customer?.active;
}

const toast = useToast();

const billingAddressFields = ref();
const shippingAddressFields = ref();

async function onSubmit(event: FormSubmitEvent<RegistrationSchema>) {
  billingAddressFields.value?.flushPendingCheck();
  if (state.isShippingAddressDifferent) {
    shippingAddressFields.value?.flushPendingCheck();
  }

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
    const customer: Schemas["Customer"] | undefined =
      // @ts-expect-error - password is required in the API type but not for guests
      await register(registrationData);

    if (needsEmailConfirmation(customer)) {
      toast.add({
        title: "Fast geschafft!",
        description:
          "Wir haben dir eine E-Mail geschickt. Bitte bestätige den Link darin, um dein Konto zu aktivieren.",
        color: "info",
      });
    } else {
      toast.add({
        title: registrationData.guest
          ? "Erfolgreich Kundendaten erfasst"
          : "Konto erfolgreich erstellt",
        color: "success",
      });
    }

    emit(
      "registration-success",
      registrationData as unknown as RegistrationSchema,
      customer,
    );
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
  "registration-success": [
    data: RegistrationSchema,
    customer: Schemas["Customer"] | undefined,
  ];
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

    <UFormField v-if="allowGuest" name="guest">
      <UCheckbox
        v-model="createAccount"
        label="Kundenkonto anlegen"
        description="Für schnellere Bestellungen mit gespeicherten Adressen"
        class="w-full"
      />
    </UFormField>

    <UFormField v-if="!state.guest" label="Passwort" name="password" required>
      <UInput v-model="state.password" type="password" class="w-full" />
    </UFormField>

    <UFormField
      v-if="!state.guest"
      label="Passwort wiederholen"
      name="passwordConfirm"
      required
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
      ref="billingAddressFields"
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
        ref="shippingAddressFields"
        v-model="state.shippingAddress"
        prefix="shippingAddress"
        :account-type="state.accountType"
        show-names
      />
    </template>

    <UFormField name="acceptedDataProtection">
      <UCheckbox v-model="state.acceptedDataProtection" class="w-full">
        <template #label>
          <span>
            Ich habe die
            <ULink to="/datenschutz"> Datenschutzbestimmungen </ULink>
            gelesen und akzeptiere diese.
          </span>
        </template>
      </UCheckbox>
    </UFormField>

    <UButton block type="submit">Speichern</UButton>
  </UForm>
</template>
