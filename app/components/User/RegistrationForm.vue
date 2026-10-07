<script setup lang="ts">
import type { RegistrationSchema } from "~/validation/registrationSchema";
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

const {
  state,
  schema,
  createAccount,
  billingAddressFields,
  shippingAddressFields,
  accountTypes,
  submit,
} = useRegistrationForm({ allowGuest: props.allowGuest });

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<RegistrationSchema>) {
  const result = await submit(event.data);
  if (!result.ok) {
    toast.add({
      title: "Registrierung fehlgeschlagen",
      description: result.message,
      color: "error",
    });
    return;
  }
  if (result.needsConfirmation) {
    toast.add({
      title: "Fast geschafft!",
      description:
        "Wir haben dir eine E-Mail geschickt. Bitte bestätige den Link darin, um dein Konto zu aktivieren.",
      color: "info",
    });
  } else {
    toast.add({
      title: result.data.guest
        ? "Erfolgreich Kundendaten erfasst"
        : "Konto erfolgreich erstellt",
      color: "success",
    });
  }
  emit("registration-success", result.data, result.customer);
}

// Presets render the form with the base components (#443).
const { hasPreset } = useThemePreset();

const emit = defineEmits<{
  "registration-success": [
    data: RegistrationSchema,
    customer: Schemas["Customer"] | undefined,
  ];
}>();
</script>

<template>
  <UserRegistrationFormPreset
    v-if="hasPreset"
    :allow-guest="allowGuest"
    @registration-success="
      (data, customer) => emit('registration-success', data, customer)
    "
  />
  <UForm
    v-else
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
