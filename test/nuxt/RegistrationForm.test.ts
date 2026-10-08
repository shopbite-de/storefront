import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import RegistrationForm from "~/components/User/RegistrationForm.vue";
import { ApiClientError } from "@shopware/api-client";

vi.mock("@shopware/api-client", () => ({
  ApiClientError: class extends Error {
    details: unknown;
    constructor(details: unknown) {
      super("ApiClientError");
      this.details = details;
    }
  },
}));

const { mockRegister, mockGetSuggestions } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockGetSuggestions: vi.fn().mockResolvedValue([]),
}));

mockNuxtImport("useUser", () => () => ({
  register: mockRegister,
}));

mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: mockGetSuggestions,
}));

type FormVm = {
  state: {
    guest: boolean;
    accountType: string;
    isShippingAddressDifferent: boolean;
  };
};
const vmOf = (wrapper: VueWrapper) => wrapper.vm as unknown as FormVm;

// SbCheckbox renders a Reka `button[role="checkbox"]` that its <label> points
// to; the button is what toggles the v-model.
async function toggleCheckbox(wrapper: VueWrapper, label: string) {
  const labelElement = wrapper
    .findAll("label")
    .find((element) => element.text().includes(label));
  await wrapper
    .get(`[id="${labelElement!.attributes("for")}"]`)
    .trigger("click");
  await nextTick();
}

// Fills everything the schema requires except the password fields.
async function fillRequiredFields(
  wrapper: VueWrapper,
  email = "john@example.com",
) {
  await wrapper.get("#firstName").setValue("John");
  await wrapper.get("#lastName").setValue("Doe");
  await wrapper.get("#email").setValue(email);
  await wrapper.get("#billingAddress-street").setValue("Musterstr 1");
  await wrapper.get("#billingAddress-zipcode").setValue("12345");
  await wrapper.get("#billingAddress-city").setValue("Musterstadt");
  await wrapper.get("#billingAddress-phoneNumber").setValue("12345678");
  await wrapper.get("#acceptedDataProtection").trigger("click");
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSuggestions.mockResolvedValue([]);
    useRuntimeConfig().public.site.countryId = "default-country-id";
  });

  it("renders correctly", async () => {
    const wrapper = await mountSuspended(RegistrationForm);
    expect(wrapper.find('input[name="email"]').exists()).toBe(true);
  });

  it("shows company field only for business account", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    expect(wrapper.find("#billingAddress-company").exists()).toBe(false);

    vmOf(wrapper).state.accountType = "business";
    await nextTick();

    expect(wrapper.find("#billingAddress-company").exists()).toBe(true);
  });

  it("shows shipping address fields when checkbox is checked", async () => {
    const wrapper = await mountSuspended(RegistrationForm);
    expect(wrapper.find("#shippingAddress-street").exists()).toBe(false);

    await toggleCheckbox(wrapper, "Lieferadresse weicht");

    expect(vmOf(wrapper).state.isShippingAddressDifferent).toBe(true);
    expect(wrapper.find("#shippingAddress-street").exists()).toBe(true);
  });

  it("submits the form with correct data", async () => {
    mockRegister.mockResolvedValueOnce({ id: "customer-id", active: true });
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(mockRegister).toHaveBeenCalled();
    const calledData = mockRegister.mock.calls[0]![0];
    expect(calledData.guest).toBe(true);
    expect(calledData.email).toBe("john@example.com");
    expect(calledData.billingAddress.street).toBe("Musterstr 1");
    // The names are copied to the billing address
    expect(calledData.billingAddress.firstName).toBe("John");
    expect(calledData.billingAddress.lastName).toBe("Doe");
    expect(calledData.password).toBeUndefined();
    expect(wrapper.emitted("registration-success")).toHaveLength(1);
  });

  it("shows the API error details in the form on ApiClientError", async () => {
    const apiClientError = new ApiClientError({
      errors: [
        {
          detail: 'The email address "lirim@veliu.net" is already in use',
        },
      ],
    } as unknown as ConstructorParameters<typeof ApiClientError>[0]);
    mockRegister.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper, "lirim@veliu.net");
    await submit(wrapper);

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain("Das hat nicht geklappt");
    expect(alert.text()).toContain(
      'The email address "lirim@veliu.net" is already in use',
    );
    expect(wrapper.emitted("registration-success")).toBeUndefined();
  });

  it("handles ApiClientError with missing errors gracefully", async () => {
    const apiClientError = new ApiClientError(
      {} as unknown as ConstructorParameters<typeof ApiClientError>[0],
    );
    mockRegister.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper, "lirim@veliu.net");
    await submit(wrapper);

    expect(wrapper.get('[role="alert"]').text()).toContain(
      "Bitte versuchen Sie es erneut.",
    );
  });

  it("proceeds with registration even when getSuggestions returns a correction", async () => {
    mockGetSuggestions.mockResolvedValue([
      {
        street: "Corrected Street 123",
        city: "Corrected City",
        zipcode: "54321",
        label: "Corrected Street 123, 54321 Corrected City",
      },
    ]);
    mockRegister.mockResolvedValueOnce({ id: "customer-id", active: true });

    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper);
    await submit(wrapper);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Registration must not be blocked by the correction suggestion
    expect(mockRegister).toHaveBeenCalled();

    // Correction UI surfaces non-blocking (flushPendingCheck triggers the async check)
    expect(wrapper.text()).toContain(
      "Meinten Sie: Corrected Street 123, 54321 Corrected City?",
    );
  });

  it("orders as a guest by default and reveals the password fields on opt-in", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    expect(wrapper.text()).toContain("Kundenkonto anlegen");
    expect(vmOf(wrapper).state.guest).toBe(true);
    expect(wrapper.find('input[name="password"]').exists()).toBe(false);

    await toggleCheckbox(wrapper, "Kundenkonto anlegen");

    expect(vmOf(wrapper).state.guest).toBe(false);
    expect(wrapper.find('input[name="password"]').exists()).toBe(true);
    expect(wrapper.find('input[name="passwordConfirm"]').exists()).toBe(true);
  });

  it("never offers a guest account when allowGuest is false", async () => {
    const wrapper = await mountSuspended(RegistrationForm, {
      props: { allowGuest: false },
    });

    expect(wrapper.text()).not.toContain("Kundenkonto anlegen");
    expect(vmOf(wrapper).state.guest).toBe(false);
    expect(wrapper.find('input[name="password"]').exists()).toBe(true);
    expect(wrapper.find('input[name="passwordConfirm"]').exists()).toBe(true);
  });

  it("does not register without a password when allowGuest is false", async () => {
    const wrapper = await mountSuspended(RegistrationForm, {
      props: { allowGuest: false },
    });

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(mockRegister).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      "Das Passwort muss mindestens 8 Zeichen lang sein.",
    );
    expect(wrapper.get("#password").attributes("aria-invalid")).toBe("true");
  });

  it("registers a real customer account when allowGuest is false", async () => {
    mockRegister.mockResolvedValueOnce({
      id: "customer-id",
      active: true,
      doubleOptInRegistration: false,
    });
    const wrapper = await mountSuspended(RegistrationForm, {
      props: { allowGuest: false },
    });

    await fillRequiredFields(wrapper);
    await wrapper.get("#password").setValue("supersecret");
    await wrapper.get("#passwordConfirm").setValue("supersecret");
    await submit(wrapper);

    expect(mockRegister).toHaveBeenCalled();
    const calledData = mockRegister.mock.calls[0]![0];
    expect(calledData.guest).toBe(false);
    expect(calledData.password).toBe("supersecret");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.emitted("registration-success")).toHaveLength(1);
  });

  it("asks for the e-mail confirmation on double opt-in registrations", async () => {
    const customer = {
      id: "customer-id",
      active: false,
      doubleOptInRegistration: true,
    };
    mockRegister.mockResolvedValueOnce(customer);
    const wrapper = await mountSuspended(RegistrationForm, {
      props: { allowGuest: false },
    });

    await fillRequiredFields(wrapper);
    await wrapper.get("#password").setValue("supersecret");
    await wrapper.get("#passwordConfirm").setValue("supersecret");
    await submit(wrapper);

    expect(wrapper.get('[role="status"]').text()).toContain("Fast geschafft");
    const emitted = wrapper.emitted("registration-success");
    expect(emitted).toBeTruthy();
    expect(emitted![0]![1]).toEqual(customer);
  });
});
