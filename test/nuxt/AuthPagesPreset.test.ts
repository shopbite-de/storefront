import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import PasswordForgotten from "~/pages/passwort-vergessen.vue";
import PasswordReset from "~/pages/account/recover/password/index.vue";

// Password pages of the presets (#445): results in the form, no toasts.
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

mockNuxtImport("useThemePreset", () => () => ({
  preset: "trattoria",
  hasPreset: true,
  menuView: "bon",
}));
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mocks.invoke },
}));

describe("password pages with a preset (#445)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("checks the e-mail before sending the recovery mail", async () => {
    const wrapper = await mountSuspended(PasswordForgotten);
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Bitte geben Sie eine gültige E-Mail");
    expect(mocks.invoke).not.toHaveBeenCalled();

    await wrapper.find('input[name="email"]').setValue("gast@example.de");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.invoke).toHaveBeenCalledWith(
      "sendRecoveryMail post /account/recovery-password",
      expect.objectContaining({
        body: expect.objectContaining({ email: "gast@example.de" }),
      }),
    );
    expect(wrapper.find('[role="status"]').text()).toContain(
      "E-Mail ist unterwegs",
    );
  });

  it("reports a failed recovery mail in the form", async () => {
    mocks.invoke.mockRejectedValue(new Error("500"));
    const wrapper = await mountSuspended(PasswordForgotten);
    await wrapper.find('input[name="email"]').setValue("gast@example.de");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "konnte nicht gesendet werden",
    );
  });

  it("sets a new password with the hash from the link", async () => {
    const wrapper = await mountSuspended(PasswordReset, {
      route: "/account/recover/password?hash=abc",
    });
    await wrapper.find('input[name="newPassword"]').setValue("geheim123");
    await wrapper
      .find('input[name="newPasswordConfirm"]')
      .setValue("anders123");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.text()).toContain("Passwörter stimmen nicht überein");
    expect(mocks.invoke).not.toHaveBeenCalled();

    await wrapper
      .find('input[name="newPasswordConfirm"]')
      .setValue("geheim123");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(mocks.invoke).toHaveBeenCalledWith(
      "recoveryPassword post /account/recovery-password-confirm",
      {
        body: {
          newPassword: "geheim123",
          newPasswordConfirm: "geheim123",
          hash: "abc",
        },
      },
    );
    expect(wrapper.find('[role="status"]').text()).toContain(
      "Ihr Passwort ist geändert",
    );
  });
});
