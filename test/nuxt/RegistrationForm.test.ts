import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import RegistrationForm from "~/components/User/RegistrationForm.vue";

const { mockRegister, mockRegisterGuest, mockGetSuggestions } = vi.hoisted(
  () => ({
    mockRegister: vi.fn(),
    mockRegisterGuest: vi.fn(),
    mockGetSuggestions: vi.fn().mockResolvedValue([]),
  }),
);

// an account (step 6) and a guest (step 5) go through the BFF (ADR 0001)
mockNuxtImport("useCustomer", () => () => ({
  register: mockRegister,
}));
mockNuxtImport("useCheckoutOrderer", () => () => ({
  registerGuest: mockRegisterGuest,
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
    mockRegisterGuest.mockResolvedValueOnce({});
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockRegisterGuest).toHaveBeenCalled();
    const details = mockRegisterGuest.mock.calls[0]![0];
    expect(details.email).toBe("john@example.com");
    expect(details.business).toBe(false);
    expect(details.billingAddress.street).toBe("Musterstr 1");
    // The names are copied to the billing address
    expect(details.billingAddress.firstName).toBe("John");
    expect(details.billingAddress.lastName).toBe("Doe");
    expect(details.deliveryAddress).toBeNull();
    expect(details).not.toHaveProperty("password");
    expect(wrapper.emitted("registration-success")).toHaveLength(1);
  });

  // the form sends no country: the backend fills in the shop's own (the
  // Shopware adapter from site.countryId); a backend without one, such as
  // the memory adapter, must not make every address invalid
  it("saves an address without a configured country id", async () => {
    useRuntimeConfig().public.site.countryId = "";
    mockRegisterGuest.mockResolvedValueOnce({});
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper);
    await submit(wrapper);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(mockRegisterGuest).toHaveBeenCalled();
    expect(mockRegisterGuest.mock.calls[0]![0].billingAddress.country).toBe(
      null,
    );
  });

  it("says in the storefront's words that the e-mail has an account", async () => {
    mockRegister.mockRejectedValueOnce(
      createError({ statusCode: 409, data: { code: "email_taken" } }),
    );
    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper, "lirim@veliu.net");
    await toggleCheckbox(wrapper, "Kundenkonto anlegen");
    await wrapper.get('input[name="password"]').setValue("geheim1234");
    await wrapper.get('input[name="passwordConfirm"]').setValue("geheim1234");
    await submit(wrapper);

    expect(mockRegisterGuest).not.toHaveBeenCalled();
    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain("Das hat nicht geklappt");
    expect(alert.text()).toContain(
      "Unter dieser E-Mail-Adresse gibt es schon ein Kundenkonto.",
    );
    expect(alert.text()).not.toContain("geheim1234");
    expect(wrapper.emitted("registration-success")).toBeUndefined();
  });

  it("asks to try again when the guest's details cannot be saved", async () => {
    mockRegisterGuest.mockRejectedValueOnce(
      Object.assign(new Error("503"), {
        statusCode: 503,
        data: { data: { code: "backend_unavailable" } },
      }),
    );
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
    mockRegisterGuest.mockResolvedValueOnce({});

    const wrapper = await mountSuspended(RegistrationForm);

    await fillRequiredFields(wrapper);
    await submit(wrapper);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Registration must not be blocked by the correction suggestion
    expect(mockRegisterGuest).toHaveBeenCalled();

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
      customer: { id: "customer-id", guest: false },
      confirmationRequired: false,
    });
    const wrapper = await mountSuspended(RegistrationForm, {
      props: { allowGuest: false },
    });

    await fillRequiredFields(wrapper);
    await wrapper.get("#password").setValue("supersecret");
    await wrapper.get("#passwordConfirm").setValue("supersecret");
    await submit(wrapper);

    expect(mockRegister).toHaveBeenCalled();
    // the domain registration: the guest's details plus the password
    const calledData = mockRegister.mock.calls[0]![0];
    expect(calledData).toMatchObject({
      firstName: expect.any(String),
      business: false,
      password: "supersecret",
      billingAddress: expect.objectContaining({ country: null }),
    });
    expect(calledData).not.toHaveProperty("guest");
    expect(calledData).not.toHaveProperty("passwordConfirm");
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.emitted("registration-success")).toHaveLength(1);
  });

  it("asks for the e-mail confirmation on double opt-in registrations", async () => {
    mockRegister.mockResolvedValueOnce({
      customer: { id: "customer-id", guest: false },
      confirmationRequired: true,
    });
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
    expect(emitted![0]![1]).toBe(true);
  });
});
