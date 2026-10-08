import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import RegistrationFormPreset from "~/components/User/RegistrationForm.vue";
import LoginFormPreset from "~/components/User/LoginForm.vue";

// Forms of the one-page checkout with a style preset (#443).
const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
}));

mockNuxtImport("useUser", () => () => ({
  register: mocks.register,
  login: mocks.login,
}));
mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: vi.fn().mockResolvedValue([]),
}));

describe("registration form with a preset (#443)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeConfig().public.site.countryId = "de";
  });

  it("lists the missing fields in a focused summary that links to them", async () => {
    const wrapper = await mountSuspended(RegistrationFormPreset, {
      attachTo: document.body,
    });
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    const summary = wrapper.get('[role="alert"]');
    expect(document.activeElement).toBe(summary.element);
    const links = summary.findAll("a");
    expect(links.length).toBeGreaterThanOrEqual(5);
    // in the order of the form
    expect(links.slice(0, 3).map((link) => link.attributes("href"))).toEqual([
      "#firstName",
      "#lastName",
      "#email",
    ]);
    for (const link of links) {
      const id = link.attributes("href")!.slice(1);
      expect(wrapper.find(`[id="${id}"]`).exists()).toBe(true);
    }
    expect(
      wrapper.get("#billingAddress-street").attributes("aria-invalid"),
    ).toBe("true");
    expect(mocks.register).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("marks the address inputs for autofill", async () => {
    const wrapper = await mountSuspended(RegistrationFormPreset);
    expect(
      wrapper.get("#billingAddress-street").attributes("autocomplete"),
    ).toBe("billing address-line1");
    expect(
      wrapper.get("#billingAddress-zipcode").attributes("autocomplete"),
    ).toBe("billing postal-code");
    expect(wrapper.get("#email").attributes("autocomplete")).toBe("email");
  });

  it("registers a guest once the form is complete", async () => {
    mocks.register.mockResolvedValue({ active: true });
    const wrapper = await mountSuspended(RegistrationFormPreset);
    await wrapper.get("#firstName").setValue("Giulia");
    await wrapper.get("#lastName").setValue("Rossi");
    await wrapper.get("#email").setValue("giulia@example.com");
    await wrapper.get("#billingAddress-street").setValue("Kantstraße 12");
    await wrapper.get("#billingAddress-zipcode").setValue("63179");
    await wrapper.get("#billingAddress-city").setValue("Obertshausen");
    await wrapper.get("#billingAddress-phoneNumber").setValue("06104 12345");
    await wrapper.get("#acceptedDataProtection").trigger("click");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({
        guest: true,
        email: "giulia@example.com",
        billingAddress: expect.objectContaining({
          firstName: "Giulia",
          street: "Kantstraße 12",
        }),
      }),
    );
    expect(wrapper.emitted("registration-success")).toHaveLength(1);
  });
});

describe("login form with a preset (#443)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows field errors and does not call the API", async () => {
    const wrapper = await mountSuspended(LoginFormPreset);
    await wrapper.get('input[name="email"]').setValue("keine-mail");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain(
      "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    );
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("shows a failed login above the form", async () => {
    mocks.login.mockRejectedValue(new Error("401"));
    const wrapper = await mountSuspended(LoginFormPreset);
    await wrapper.get('input[name="email"]').setValue("giulia@example.com");
    await wrapper.get('input[name="password"]').setValue("geheim1234");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      "Anmeldung fehlgeschlagen",
    );
  });
});
