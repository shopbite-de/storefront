<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { createRegistrationSchema } from "~/validation/registrationSchema";
import type { RegistrationSchema } from "~/validation/registrationSchema";
import type { FormSubmitEvent } from "@nuxt/ui";

const { register, isLoggedIn } = useUser();
const {
  suggestions: billingSuggestions,
  isLoading: isBillingLoading,
  error: billingError,
  searchAddress: searchBillingAddress,
  getZipcodeForCity,
  allowedCities,
} = useAddressAutocomplete();

const {
  suggestions: shippingSuggestions,
  isLoading: isShippingLoading,
  error: shippingError,
  searchAddress: searchShippingAddress,
} = useAddressAutocomplete();

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
  storefrontUrl: "https://pizzeria-lafattoria.de",
  billingAddress: {
    company: undefined,
    department: undefined,
    salutationId: undefined,
    firstName: undefined,
    lastName: undefined,
    phoneNumber: undefined,
    street: undefined,
    additionalAddressLine: undefined, // For apartment/unit numbers
    zipcode: undefined,
    city: undefined,
    countryId: "018d9f162ade709b9ccc92929b44d236",
    addressValidated: false, // Track if address was selected from autocomplete
  },
  shippingAddress: {
    company: undefined,
    department: undefined,
    salutationId: undefined,
    firstName: undefined,
    lastName: undefined,
    phoneNumber: undefined,
    street: undefined,
    additionalAddressLine: undefined, // For apartment/unit numbers
    zipcode: undefined,
    city: undefined,
    countryId: "018d9f162ade709b9ccc92929b44d236",
    addressValidated: false, // Track if address was selected from autocomplete
  },
});

const schema = computed(() => createRegistrationSchema(state));

const toast = useToast();
const form = ref();

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

// Debounced search for billing address
const debouncedBillingSearch = useDebounceFn((street: string, city: string) => {
  if (city && street) {
    searchBillingAddress(street, city);
  }
}, 500);

// Debounced search for shipping address
const debouncedShippingSearch = useDebounceFn(
  (street: string, city: string) => {
    if (city && street) {
      searchShippingAddress(street, city);
    }
  },
  500,
);

// Watch for billing address changes
watch(
  () => [state.billingAddress.street, state.billingAddress.city],
  ([street, city]) => {
    // Don't search if the street matches the last validated one (user just selected it)
    if (
      street &&
      city &&
      !state.isShippingAddressDifferent &&
      street !== lastValidatedBillingStreet.value
    ) {
      debouncedBillingSearch(street as string, city as string);
    }
  },
);

// Watch for shipping address changes
watch(
  () => [state.shippingAddress.street, state.shippingAddress.city],
  ([street, city]) => {
    // Don't search if the street matches the last validated one (user just selected it)
    if (
      street &&
      city &&
      state.isShippingAddressDifferent &&
      street !== lastValidatedShippingStreet.value
    ) {
      debouncedShippingSearch(street as string, city as string);
    }
  },
);

// Auto-fill zipcode when city is selected
watch(
  () => state.billingAddress.city,
  (city) => {
    if (city && !state.isShippingAddressDifferent) {
      state.billingAddress.zipcode = getZipcodeForCity(city);
    }
  },
);

watch(
  () => state.shippingAddress.city,
  (city) => {
    if (city && state.isShippingAddressDifferent) {
      state.shippingAddress.zipcode = getZipcodeForCity(city);
    }
  },
);

// Store the last validated street to compare against manual changes
const lastValidatedBillingStreet = ref<string>("");
const lastValidatedShippingStreet = ref<string>("");

// Handle billing address selection from suggestions
const selectBillingAddress = (suggestion: any) => {
  // Set validation flag FIRST before updating other fields
  state.billingAddress.addressValidated = true;
  lastValidatedBillingStreet.value = suggestion.street;

  // Then update address fields
  state.billingAddress.street = suggestion.street;
  state.billingAddress.zipcode = suggestion.zipcode;
  state.billingAddress.city = suggestion.city;

  billingSuggestions.value = [];

  // Clear any validation errors for this field
  nextTick(() => {
    if (form.value?.clear) {
      form.value.clear("billingAddress.street");
    }
  });
};

// Handle shipping address selection from suggestions
const selectShippingAddress = (suggestion: any) => {
  // Set validation flag FIRST before updating other fields
  state.shippingAddress.addressValidated = true;
  lastValidatedShippingStreet.value = suggestion.street;

  // Then update address fields
  state.shippingAddress.street = suggestion.street;
  state.shippingAddress.zipcode = suggestion.zipcode;
  state.shippingAddress.city = suggestion.city;

  shippingSuggestions.value = [];

  // Clear any validation errors for this field
  nextTick(() => {
    if (form.value?.clear) {
      form.value.clear("shippingAddress.street");
    }
  });
};

// Reset validation only when street is manually changed (different from validated street)
watch(
  () => state.billingAddress.street,
  (newStreet) => {
    if (newStreet !== lastValidatedBillingStreet.value) {
      state.billingAddress.addressValidated = false;
    }
  },
);

watch(
  () => state.shippingAddress.street,
  (newStreet) => {
    if (newStreet !== lastValidatedShippingStreet.value) {
      state.shippingAddress.addressValidated = false;
    }
  },
);
</script>

<template>
  <UForm
    ref="form"
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
      label="Ort"
      name="billingAddress.city"
      required
      hint="Nur Obertshausen und Lämmerspiel (Mühlheim am Main) verfügbar"
    >
      <USelect
        v-if="!state.isShippingAddressDifferent"
        v-model="state.billingAddress.city"
        :items="allowedCities"
        class="w-full"
        placeholder="Stadt auswählen"
      />
      <UInput
        v-else
        v-model="state.billingAddress.city"
        type="text"
        class="w-full"
        disabled
        placeholder="Wird automatisch ausgefüllt"
      />
    </UFormField>

    <UFormField
      label="Straße und Hausnr."
      name="billingAddress.street"
      required
      :hint="billingError || undefined"
      :validate-on="['blur', 'submit']"
    >
      <div class="relative">
        <UInput
          v-model="state.billingAddress.street"
          type="text"
          class="w-full"
          placeholder="z.B. Hauptstraße 1"
          :loading="isBillingLoading"
        />
        <div
          v-if="billingSuggestions.length > 0"
          class="absolute z-50 w-full mt-1 border border-gray-200  rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <button
            v-for="(suggestion, index) in billingSuggestions"
            :key="index"
            type="button"
            class="w-full px-4 py-2 text-left text-sm"
            @click="selectBillingAddress(suggestion)"
          >
            <div class="font-medium">{{ suggestion.street }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ suggestion.zipcode }} {{ suggestion.city }}
            </div>
          </button>
        </div>
      </div>
    </UFormField>

    <UFormField
      label="Adresszusatz"
      name="billingAddress.additionalAddressLine"
      hint="Optional: Wohnung, Etage, Gebäude, etc."
    >
      <UInput
        v-model="state.billingAddress.additionalAddressLine"
        type="text"
        class="w-full"
        placeholder="z.B. Wohnung 5, 2. OG"
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
        disabled
        placeholder="Wird automatisch ausgefüllt"
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
      label="Ort"
      name="shippingAddress.city"
      hint="Nur Obertshausen und Lämmerspiel (Mühlheim am Main) verfügbar"
    >
      <USelect
        v-model="state.shippingAddress.city"
        :items="allowedCities"
        class="w-full"
        placeholder="Stadt auswählen"
      />
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Straße und Hausnr."
      name="shippingAddress.street"
      :hint="shippingError || undefined"
      :validate-on="['blur', 'submit']"
    >
      <div class="relative">
        <UInput
          v-model="state.shippingAddress.street"
          type="text"
          class="w-full"
          placeholder="z.B. Hauptstraße 1"
          :loading="isShippingLoading"
        />
        <div
          v-if="shippingSuggestions.length > 0"
          class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <button
            v-for="(suggestion, index) in shippingSuggestions"
            :key="index"
            type="button"
            class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            @click="selectShippingAddress(suggestion)"
          >
            <div class="font-medium">{{ suggestion.street }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ suggestion.zipcode }} {{ suggestion.city }}
            </div>
          </button>
        </div>
      </div>
    </UFormField>

    <UFormField
      v-if="state.isShippingAddressDifferent"
      label="Adresszusatz"
      name="shippingAddress.additionalAddressLine"
      hint="Optional: Wohnung, Etage, Gebäude, etc."
    >
      <UInput
        v-model="state.shippingAddress.additionalAddressLine"
        type="text"
        class="w-full"
        placeholder="z.B. Wohnung 5, 2. OG"
      />
    </UFormField>

    <UButton block type="submit">Speichern</UButton>
  </UForm>
</template>
