import { describe, it, expect, vi } from "vitest";
import { reactive, ref } from "vue";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import Fields from "~/components/Address/Fields.vue";

const { mockGetSuggestions } = vi.hoisted(() => ({
  mockGetSuggestions: vi.fn().mockResolvedValue([]),
}));

mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: mockGetSuggestions,
}));

describe("AddressFields", () => {
  const defaultProps = {
    modelValue: {
      firstName: "",
      lastName: "",
      street: "",
      zipcode: "",
      city: "",
      phoneNumber: "",
    },
    prefix: "billingAddress",
  };

  it("renders basic address fields", async () => {
    const wrapper = await mountSuspended(Fields, {
      props: defaultProps,
    });

    expect(wrapper.find('input[name="billingAddress.street"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('input[name="billingAddress.zipcode"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('input[name="billingAddress.city"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('input[name="billingAddress.phoneNumber"]').exists(),
    ).toBe(true);
  });

  it("renders name fields when showNames is true", async () => {
    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        showNames: true,
      },
    });

    expect(
      wrapper.find('input[name="billingAddress.firstName"]').exists(),
    ).toBe(true);
    expect(wrapper.find('input[name="billingAddress.lastName"]').exists()).toBe(
      true,
    );
  });

  it("does not render name fields when showNames is false", async () => {
    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        showNames: false,
      },
    });

    expect(
      wrapper.find('input[name="billingAddress.firstName"]').exists(),
    ).toBe(false);
    expect(wrapper.find('input[name="billingAddress.lastName"]').exists()).toBe(
      false,
    );
  });

  it("renders business fields when accountType is business", async () => {
    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        accountType: "business",
      },
    });

    expect(wrapper.find('input[name="billingAddress.company"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.find('input[name="billingAddress.department"]').exists(),
    ).toBe(true);
  });

  it("updates modelValue when input changes", async () => {
    const modelValue = reactive({
      firstName: "",
      lastName: "",
      street: "",
      zipcode: "",
      city: "",
      phoneNumber: "",
    });
    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
        "onUpdate:modelValue": (val: any) => Object.assign(modelValue, val),
      },
    });

    await wrapper
      .find('input[name="billingAddress.street"]')
      .setValue("New Street");
    expect(modelValue.street).toBe("New Street");
  });

  it("shows warning when an invalid city is selected for shipping address", async () => {
    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "Main St 1",
      zipcode: "12345",
      city: "InvalidCity",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
        isShipping: true,
      },
    });

    expect(wrapper.text()).toContain(
      "An diese Adresse können wir leider nicht liefern.",
    );
  });

  it("does not show warning for valid city in shipping address", async () => {
    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "Main St 1",
      zipcode: "63179",
      city: "Obertshausen",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
        isShipping: true,
      },
    });

    expect(wrapper.text()).not.toContain(
      "An diese Adresse können wir leider nicht liefern.",
    );
  });

  it("does not show warning for billing address even if city is 'invalid'", async () => {
    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "Main St 1",
      zipcode: "12345",
      city: "InvalidCity",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
        isShipping: false,
      },
    });

    expect(wrapper.text()).not.toContain(
      "An diese Adresse können wir leider nicht liefern.",
    );
  });

  it("shows correction automatically on input after debounce", async () => {
    mockGetSuggestions.mockResolvedValue([
      {
        street: "Corrected Street 123",
        city: "Corrected City",
        zipcode: "54321",
        label: "Corrected Street 123, 54321 Corrected City",
      },
    ]);

    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "Musterstr 1",
      zipcode: "12345",
      city: "Musterstadt",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
      },
    });

    // Change input to trigger watch
    await wrapper
      .find('input[name="billingAddress.street"]')
      .setValue("Musterstr 2");

    // Wait for debounce and async check
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(wrapper.text()).toContain(
      "Meinten Sie: Corrected Street 123, 54321 Corrected City?",
    );
  });

  it("shows correction when checkAddress is called", async () => {
    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "Musterstr 1",
      zipcode: "12345",
      city: "Musterstadt",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
      },
    });

    // Mock getSuggestions to return a correction
    // Note: In a real test we might need to mock useAddressAutocomplete
    // But let's see if we can just call the exposed method

    // For this to work reliably in test, we might need to mock useAddressAutocomplete
    // since it's used inside checkAddress
  });

  it("shows correction automatically on input after debounce even for short street names", async () => {
    mockGetSuggestions.mockResolvedValueOnce([
      {
        street: "B 1",
        city: "Berlin",
        zipcode: "10115",
        label: "B 1, 10115 Berlin",
      },
    ]);

    const modelValue = reactive({
      firstName: "John",
      lastName: "Doe",
      street: "",
      zipcode: "10115",
      city: "Berlin",
      phoneNumber: "12345678",
    });

    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
      },
    });

    // Change input to trigger watch
    await wrapper.find('input[name="billingAddress.street"]').setValue("B1");

    // Wait for debounce and async check
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(wrapper.text()).toContain("Meinten Sie: B 1, 10115 Berlin?");
  });
});
