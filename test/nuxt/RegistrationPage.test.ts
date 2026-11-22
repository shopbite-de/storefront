import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import RegistrationPage from "~/pages/registrierung/index.vue";

// The registration page (ADR 0001, step 6 review): with double opt-in the
// visitor stays and reads that a confirmation mail is on its way.
const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport("navigateTo", () => navigateToMock);
mockNuxtImport("useCustomer", () => () => ({ isLoggedIn: ref(false) }));
mockNuxtImport("useAddressAutocomplete", () => () => ({
  getSuggestions: vi.fn().mockResolvedValue([]),
}));

describe("registrierung", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays and asks to confirm the e-mail with double opt-in", async () => {
    const wrapper = await mountSuspended(RegistrationPage);
    wrapper
      .findComponent({ name: "UserRegistrationForm" })
      .vm.$emit("registration-success", {}, true);
    await flushPromises();
    expect(navigateToMock).not.toHaveBeenCalled();
    expect(wrapper.get('[role="status"]').text()).toContain("Fast geschafft");
  });

  it("opens the account after a registration without confirmation", async () => {
    const wrapper = await mountSuspended(RegistrationPage);
    wrapper
      .findComponent({ name: "UserRegistrationForm" })
      .vm.$emit("registration-success", {}, false);
    await flushPromises();
    expect(navigateToMock).toHaveBeenCalledWith("/konto");
  });
});
