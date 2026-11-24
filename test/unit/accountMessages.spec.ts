import { describe, expect, it } from "vitest";
import {
  credentialChangeMessage,
  loginMessage,
  registrationMessage,
} from "../../app/utils/accountMessages";
import { messages } from "../support/messages";

const { t } = messages("de");
const { t: en } = messages("en");

// The account's forms speak the storefront's words by domain code (ADR
// 0001, step 6; ADR 0002), never the backend's texts.
describe("account messages", () => {
  it("answers a wrong password and an unknown e-mail with one text", () => {
    expect(loginMessage(t, "invalid_credentials")).toBe(
      "Bitte überprüfen Sie Ihre Zugangsdaten.",
    );
    expect(loginMessage(t, "account_not_confirmed")).toContain(
      "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse",
    );
    // a locked account is no pending confirmation
    expect(loginMessage(t, "account_inactive")).toBe(
      "Dieses Kundenkonto ist gesperrt. Bitte wenden Sie sich an uns.",
    );
  });

  it("names the seconds to wait when the backend says them", () => {
    expect(loginMessage(t, "rate_limited", { retryAfterSeconds: 9.2 })).toBe(
      "Zu viele Anmeldeversuche. Bitte warten Sie 10 Sekunden und versuchen Sie es dann noch einmal.",
    );
    expect(loginMessage(t, "rate_limited")).toContain("einen Moment");
    expect(loginMessage(t, "backend_unavailable")).toContain(
      "später noch einmal",
    );
  });

  it("explains a refused registration", () => {
    expect(registrationMessage(t, "email_taken")).toContain(
      "gibt es schon ein Kundenkonto",
    );
    expect(
      registrationMessage(t, "validation_failed", { fields: ["password"] }),
    ).toContain("Passwort");
    expect(
      registrationMessage(t, "validation_failed", { fields: ["email"] }),
    ).toBe("Bitte prüfen Sie Ihre Angaben.");
    expect(registrationMessage(t, undefined)).toBe(
      "Bitte versuchen Sie es erneut.",
    );
  });

  it("explains a refused e-mail or password change", () => {
    expect(credentialChangeMessage(t, "invalid_credentials")).toBe(
      "Das Passwort stimmt nicht.",
    );
    expect(credentialChangeMessage(t, "email_taken")).toContain("Kundenkonto");
    expect(
      credentialChangeMessage(t, "rate_limited", { retryAfterSeconds: 3 }),
    ).toBe(
      "Zu viele Versuche. Bitte warten Sie 3 Sekunden und versuchen Sie es dann noch einmal.",
    );
  });

  it("speaks English in an English shop", () => {
    expect(loginMessage(en, "invalid_credentials")).toBe(
      "Please check your login details.",
    );
    expect(loginMessage(en, "rate_limited", { retryAfterSeconds: 9.2 })).toBe(
      "Too many login attempts. Please wait 10 seconds and then try again.",
    );
    expect(loginMessage(en, "rate_limited")).toBe(
      "Too many login attempts. Please wait a moment and then try again.",
    );
    expect(
      registrationMessage(en, "validation_failed", { fields: ["password"] }),
    ).toBe("The password is not accepted. Please choose a longer password.");
    expect(registrationMessage(en, "email_taken")).toContain(
      "already a customer account",
    );
    expect(credentialChangeMessage(en, "invalid_credentials")).toBe(
      "The password is not correct.",
    );
    expect(credentialChangeMessage(en, undefined)).toBe(
      "Please try again later.",
    );
  });
});
