import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import RegistrationForm from "~/components/User/RegistrationForm.vue";
import { flushPromises } from "@vue/test-utils";

describe("RegistrationForm Validation", () => {
  it("shows error for street when empty and clears it when filled", async () => {
    const wrapper = await mountSuspended(RegistrationForm);

    const form = wrapper.find("form");
    await form.trigger("submit");
    await flushPromises();

    // Check for street error message
    expect(wrapper.text()).toContain(
      "Bitte geben Sie Ihre Straße und Hausnummer an.",
    );

    // Find the street input and fill it
    const streetInput = wrapper.find('input[name="billingAddress.street"]');
    await streetInput.setValue("Hauptstraße 1");

    // Fill other required fields to satisfy overall validation if needed
    const zipInput = wrapper.find('input[name="billingAddress.zipcode"]');
    await zipInput.setValue("60311");
    const cityInput = wrapper.find('input[name="billingAddress.city"]');
    await cityInput.setValue("Frankfurt");

    await flushPromises();

    // Trigger validation again or check if error disappeared
    await form.trigger("submit");
    await flushPromises();

    expect(wrapper.text()).not.toContain(
      "Bitte geben Sie Ihre Straße und Hausnummer an.",
    );
  });
});
