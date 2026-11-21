import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import PasswordForgotten from "~/pages/passwort-vergessen.vue";
import PasswordReset from "~/pages/account/recover/password/index.vue";

// Password pages of the presets (#445): results in the form, no toasts;
// through the BFF (ADR 0001, step 6).
const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  menuView: "bon",
}));
mockNuxtImport("useCustomer", () => () => ({
  requestPasswordReset: mocks.requestPasswordReset,
  resetPassword: mocks.resetPassword,
}));

describe("password pages with a preset (#445)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestPasswordReset.mockReset().mockResolvedValue(undefined);
    mocks.resetPassword.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks the e-mail before sending the recovery mail", async () => {
    const wrapper = await mountSuspended(PasswordForgotten);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Bitte geben Sie eine gültige E-Mail");
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();

    await wrapper.find('input[name="email"]').setValue("gast@example.de");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("gast@example.de");
    expect(wrapper.find('[role="status"]').text()).toContain(
      "E-Mail ist unterwegs",
    );
  });

  it("reports a failed recovery mail in the form", async () => {
    mocks.requestPasswordReset.mockRejectedValue(new Error("500"));
    const wrapper = await mountSuspended(PasswordForgotten);
    await wrapper.find('input[name="email"]').setValue("gast@example.de");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "konnte nicht gesendet werden",
    );
  });

  it("sets a new password with the hash from the link", async () => {
    const replace = vi.spyOn(useRouter(), "replace");
    const wrapper = await mountSuspended(PasswordReset, {
      route: "/account/recover/password?hash=abc",
    });
    // the hash is read once and removed from the address bar
    expect(replace).toHaveBeenLastCalledWith({ query: {} });
    await wrapper.find('input[name="newPassword"]').setValue("geheim123");
    await wrapper
      .find('input[name="newPasswordConfirm"]')
      .setValue("anders123");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Passwörter stimmen nicht überein");
    expect(mocks.resetPassword).not.toHaveBeenCalled();

    await wrapper
      .find('input[name="newPasswordConfirm"]')
      .setValue("geheim123");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    // the link's hash is the token, the new password goes once
    expect(mocks.resetPassword).toHaveBeenCalledWith("abc", "geheim123");
    expect(wrapper.find('[role="status"]').text()).toContain(
      "Ihr Passwort ist geändert",
    );
  });
});
