import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import Fields from "~/components/Address/Fields.vue";

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
    const modelValue = {
      firstName: "",
      lastName: "",
      street: "",
      zipcode: "",
      city: "",
      phoneNumber: "",
    };
    const wrapper = await mountSuspended(Fields, {
      props: {
        ...defaultProps,
        modelValue,
      },
    });

    const streetInput = wrapper.find('input[name="billingAddress.street"]');
    await streetInput.setValue("New Street 123");

    expect(modelValue.street).toBe("New Street 123");
  });
});
