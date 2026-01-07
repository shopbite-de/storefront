import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, nextTick } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import RegistrationForm from "~/components/User/RegistrationForm.vue";
import { ApiClientError } from "@shopware/api-client";

vi.mock("@shopware/api-client", () => ({
  ApiClientError: class extends Error {
    details: any;
    constructor(details: any) {
      super("ApiClientError");
      this.details = details;
    }
  },
}));

const { mockRegister, mockIsLoggedIn, mockGetSuggestions } = vi.hoisted(() => {
  return {
    mockRegister: vi.fn(),
    mockIsLoggedIn: { value: false },
    mockGetSuggestions: vi.fn().mockResolvedValue([]),
  };
});

mockNuxtImport("useUser", () => () => ({
  register: mockRegister,
  isLoggedIn: ref(mockIsLoggedIn.value),
}));

mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: mockGetSuggestions,
}));

const mockToastAdd = vi.fn();
mockNuxtImport("useToast", () => () => ({
  add: mockToastAdd,
}));

// Mock useRuntimeConfig
mockNuxtImport("useRuntimeConfig", () => () => ({
  public: {
    shopware: {
      devStorefrontUrl: "http://localhost:3000",
    },
    site: {
      countryId: "default-country-id",
    },
  },
}));

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn.value = false;
  });

  it("renders correctly", async () => {
    const wrapper = await mountSuspended(RegistrationForm);
    expect(wrapper.exists()).toBeTruthy();
    expect(wrapper.find('input[name="email"]').exists()).toBe(true);
  });

  it("shows company field only for business account", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    // Initially private, so company field should NOT be in billing address
    expect(wrapper.find('input[name="billingAddress.company"]').exists()).toBe(
      false,
    );

    // Switch to business
    // @ts-ignore
    wrapper.vm.state.accountType = "business";
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Try to find by name again
    expect(wrapper.find('input[name="billingAddress.company"]').exists()).toBe(
      true,
    );
  });

  it("shows shipping address fields when checkbox is checked", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    // Initial count of street inputs
    const initialStreets = wrapper.findAll(
      'input[name="billingAddress.street"]',
    ).length;

    // @ts-ignore
    wrapper.vm.state.isShippingAddressDifferent = true;
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have more street inputs now (billing street + shipping street)
    expect(wrapper.findAll('input[name$=".street"]').length).toBeGreaterThan(
      initialStreets,
    );
  });

  it("submits the form with correct data", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    // Fill required fields
    await wrapper.find('input[name="firstName"]').setValue("John");
    await wrapper.find('input[name="lastName"]').setValue("Doe");
    await wrapper.find('input[name="email"]').setValue("john@example.com");

    // Billing address fields (AddressFields component)
    // Manually update state since USelectMenu is hard to interact with in simple tests
    // @ts-ignore
    wrapper.vm.state.billingAddress.street = "Musterstr 1";
    // Set zipcode and city directly since fields are removed
    // @ts-ignore
    wrapper.vm.state.billingAddress.zipcode = "12345";
    // @ts-ignore
    wrapper.vm.state.billingAddress.city = "Musterstadt";

    await wrapper
      .find('input[name="billingAddress.phoneNumber"]')
      .setValue("12345678");

    // Accept data protection
    const dpCheckbox = wrapper.find('input[name="acceptedDataProtection"]');
    await dpCheckbox.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Submit
    await wrapper.find("form").trigger("submit");

    // Wait for async validation and submission
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockRegister).toHaveBeenCalled();
    const calledData = mockRegister.mock.calls[0][0];
    expect(calledData.email).toBe("john@example.com");
    expect(calledData.billingAddress.street).toBe("Musterstr 1");
    // Check if firstName/lastName were copied to billing address as per logic in onSubmit
    expect(calledData.billingAddress.firstName).toBe("John");
    expect(calledData.billingAddress.lastName).toBe("Doe");
  });

  it("shows detailed error toast on ApiClientError during registration", async () => {
    const apiClientError = new ApiClientError({
      errors: [
        {
          detail: 'The email address "lirim@veliu.net" is already in use',
        },
      ],
    });
    mockRegister.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(RegistrationForm);

    // Fill minimum required fields to trigger onSubmit
    await wrapper.find('input[name="firstName"]').setValue("John");
    await wrapper.find('input[name="lastName"]').setValue("Doe");
    await wrapper.find('input[name="email"]').setValue("lirim@veliu.net");
    // @ts-ignore
    wrapper.vm.state.billingAddress.street = "Musterstr 1";
    // @ts-ignore
    wrapper.vm.state.billingAddress.city = "Musterstadt";
    await wrapper
      .find('input[name="billingAddress.phoneNumber"]')
      .setValue("12345678");
    await wrapper.find('input[name="acceptedDataProtection"]').trigger("click");

    await wrapper.find("form").trigger("submit");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Registrierung fehlgeschlagen",
        description: 'The email address "lirim@veliu.net" is already in use',
        color: "error",
      }),
    );
  });

  it("handles ApiClientError with missing errors gracefully", async () => {
    const apiClientError = new ApiClientError({});
    mockRegister.mockRejectedValueOnce(apiClientError);
    const wrapper = await mountSuspended(RegistrationForm);

    // Fill minimum required fields to trigger onSubmit
    await wrapper.find('input[name="firstName"]').setValue("John");
    await wrapper.find('input[name="lastName"]').setValue("Doe");
    await wrapper.find('input[name="email"]').setValue("lirim@veliu.net");
    // @ts-ignore
    wrapper.vm.state.billingAddress.street = "Musterstr 1";
    // @ts-ignore
    wrapper.vm.state.billingAddress.city = "Musterstadt";
    await wrapper
      .find('input[name="billingAddress.phoneNumber"]')
      .setValue("12345678");
    await wrapper.find('input[name="acceptedDataProtection"]').trigger("click");

    await wrapper.find("form").trigger("submit");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Registrierung fehlgeschlagen",
        description: "Bitte versuchen Sie es erneut.",
        color: "error",
      }),
    );
  });

  it("shows correction suggestion and stops submission when address needs correction", async () => {
    mockGetSuggestions.mockResolvedValueOnce([
      {
        street: "Corrected Street 123",
        city: "Corrected City",
        zipcode: "54321",
        label: "Corrected Street 123, 54321 Corrected City",
      },
    ]);

    const wrapper = await mountSuspended(RegistrationForm);

    // Fill required fields
    await wrapper.find('input[name="firstName"]').setValue("John");
    await wrapper.find('input[name="lastName"]').setValue("Doe");
    await wrapper.find('input[name="email"]').setValue("john@example.com");
    // @ts-ignore
    wrapper.vm.state.billingAddress.street = "Musterstr 1";
    // @ts-ignore
    wrapper.vm.state.billingAddress.zipcode = "12345";
    // @ts-ignore
    wrapper.vm.state.billingAddress.city = "Musterstadt";
    await wrapper
      .find('input[name="billingAddress.phoneNumber"]')
      .setValue("12345678");
    await wrapper.find('input[name="acceptedDataProtection"]').trigger("click");

    await wrapper.find("form").trigger("submit");
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should NOT have called register
    expect(mockRegister).not.toHaveBeenCalled();

    // Should have shown a toast
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Adresskorrektur vorgeschlagen",
      }),
    );

    // Should show the correction alert in the form
    expect(wrapper.text()).toContain(
      "Meinten Sie: Corrected Street 123, 54321 Corrected City?",
    );
  });
});
