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

/**
 * The form asks for no country and sends none (`country: null`): the
 * backend uses the shop's own (the Shopware adapter `site.countryId`). The
 * schema checks the field as filled only, like `Address/Form.vue`, so a
 * backend without a configured country id (memory) takes the address too.
 */
const SHOP_COUNTRY = "shop";

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
      /** Double opt-in: the e-mail is to be confirmed before the login. */
      needsConfirmation: boolean;
    }
  | { ok: false; message: string };

/**
 * State, schema and submit of the customer registration (#443) and of the
 * checkout's guest details (User/RegistrationForm.vue). `submit()` reports
 * the outcome; the form decides how to show it. A guest goes through the
 * BFF (`/api/checkout/guest`, ADR 0001 step 5), an account too
 * (`/api/account/register`, step 6).
 */
export function useRegistrationForm(options: { allowGuest: boolean }) {
  // Where to go after a successful registration is the caller's decision: the
  // registration page sends the visitor to the account, the checkout continues
  // with the order.
  const { t } = useI18n();
  const { register } = useCustomer();
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
      countryId: SHOP_COUNTRY,
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
      countryId: SHOP_COUNTRY,
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
          needsConfirmation: false,
        };
      } catch (error) {
        console.error(
          "Guest details failed:",
          domainErrorCode(error) ?? "no answer",
        );
        const code = domainErrorCode(error);
        return {
          ok: false,
          message:
            code === "invalid_value" || code === "validation_failed"
              ? t("auth.errors.checkDetails")
              : t("auth.errors.retry"),
        };
      }
    }

    try {
      // with double opt-in there is no login until the e-mail is confirmed
      const answer = await register({
        ...toGuestDetails(registrationData as unknown as RegistrationSchema),
        password: data.password ?? "",
      });
      return {
        ok: true,
        data: registrationData as unknown as RegistrationSchema,
        needsConfirmation: answer.confirmationRequired,
      };
    } catch (error) {
      const code = domainErrorCode(error);
      // the code only: the error of a request carries its body
      console.error("Registration failed:", code ?? "no answer");
      return {
        ok: false,
        message: registrationMessage(t, code, domainErrorDetails(error)),
      };
    }
  }

  const accountTypes = [
    {
      label: t("auth.registrationForm.privateCustomer"),
      value: "private" as const,
    },
    {
      label: t("auth.registrationForm.businessCustomer"),
      value: "business" as const,
    },
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
