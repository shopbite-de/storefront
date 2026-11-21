import { ApiClientError } from "@shopware/api-client";
import type { Schemas } from "#shopware";
import type { AddressInput, GuestDetails } from "../../shared/domain";
import { createRegistrationSchema } from "~/validation/registrationSchema";
import type {
  AddressSchema,
  RegistrationSchema,
} from "~/validation/registrationSchema";

/** The form's address as a domain address of the shop's country. */
function toAddress(address: Partial<AddressSchema>): AddressInput {
  return {
    salutation: null,
    firstName: address.firstName ?? "",
    lastName: address.lastName ?? "",
    company: address.company || null,
    department: address.department || null,
    street: address.street ?? "",
    additionalLine: address.additionalAddressLine1 || null,
    postalCode: address.zipcode ?? "",
    city: address.city ?? "",
    // the shop's own country (`site.countryId`), as the form always sent it
    country: null,
    phone: address.phoneNumber || null,
  };
}

/** The checkout form as the guest's details (ADR 0001, step 5). */
export function toGuestDetails(data: RegistrationSchema): GuestDetails {
  return {
    email: data.email,
    salutation: null,
    firstName: data.firstName,
    lastName: data.lastName,
    business: data.accountType === "business",
    billingAddress: toAddress(data.billingAddress),
    deliveryAddress: data.shippingAddress
      ? toAddress(data.shippingAddress)
      : null,
  };
}

export type RegistrationResult =
  | {
      ok: true;
      data: RegistrationSchema;
      customer: Schemas["Customer"] | undefined;
      needsConfirmation: boolean;
    }
  | { ok: false; message: string };

/**
 * State, schema and submit of the customer registration (#443) and of the
 * checkout's guest details (User/RegistrationForm.vue). `submit()` reports
 * the outcome; the form decides how to show it. A guest goes through the
 * BFF (`/api/checkout/guest`, ADR 0001 step 5); creating an account still
 * uses the Shopware layer until step 6.
 */
export function useRegistrationForm(options: { allowGuest: boolean }) {
  const config = useRuntimeConfig();
  // Where to go after a successful registration is the caller's decision: the
  // registration page sends the visitor to the account, the checkout continues
  // with the order.
  const { register } = useUser();
  const { registerGuest } = useCheckoutOrderer();

  const state = reactive({
    accountType: "private" as "private" | "business",
    salutationId: "",
    firstName: "",
    lastName: "",
    email: "",
    guest: options.allowGuest,
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

  const billingAddressFields = ref();
  const shippingAddressFields = ref();

  async function submit(data: RegistrationSchema): Promise<RegistrationResult> {
    billingAddressFields.value?.flushPendingCheck();
    if (state.isShippingAddressDifferent) {
      shippingAddressFields.value?.flushPendingCheck();
    }

    const registrationData = { ...data };

    if (
      !registrationData.billingAddress.firstName &&
      registrationData.firstName
    ) {
      registrationData.billingAddress.firstName = registrationData.firstName;
    }

    if (
      !registrationData.billingAddress.lastName &&
      registrationData.lastName
    ) {
      registrationData.billingAddress.lastName = registrationData.lastName;
    }

    if (!state.isShippingAddressDifferent) {
      delete registrationData.shippingAddress;
    }

    if (registrationData.guest) {
      delete registrationData.password;
      delete registrationData.passwordConfirm;
    }

    if (registrationData.guest) {
      try {
        await registerGuest(
          toGuestDetails(registrationData as unknown as RegistrationSchema),
        );
        return {
          ok: true,
          data: registrationData as unknown as RegistrationSchema,
          customer: undefined,
          needsConfirmation: false,
        };
      } catch (error) {
        console.error("Guest details failed:", error);
        const code = domainErrorCode(error);
        return {
          ok: false,
          message:
            code === "invalid_value" || code === "validation_failed"
              ? "Bitte prüfen Sie Ihre Angaben."
              : "Bitte versuchen Sie es erneut.",
        };
      }
    }

    try {
      const customer: Schemas["Customer"] | undefined =
        // @ts-expect-error - password is required in the API type but not for guests
        await register(registrationData);
      return {
        ok: true,
        data: registrationData as unknown as RegistrationSchema,
        customer,
        needsConfirmation: needsEmailConfirmation(customer),
      };
    } catch (error) {
      console.error("Registration failed:", error);
      let message = "Bitte versuchen Sie es erneut.";
      if (error instanceof ApiClientError) {
        const errors = error.details?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          message = errors
            .map((e) => e.detail || e.title)
            .filter(Boolean)
            .join("\n");
        }
      }
      return { ok: false, message };
    }
  }

  const accountTypes = [
    { label: "Privatkunde", value: "private" as const },
    { label: "Geschäftskunde", value: "business" as const },
  ];

  return {
    state,
    schema,
    createAccount,
    billingAddressFields,
    shippingAddressFields,
    accountTypes,
    submit,
  };
}
