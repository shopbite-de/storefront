import { describe, expect, it } from "vitest";
import {
  credentialChangeMessage,
  loginMessage,
  registrationMessage,
} from "../../app/utils/accountMessages";

// The account's forms speak the storefront's German by domain code (ADR
// 0001, step 6), never the backend's texts.
describe("account messages", () => {
  it("answers a wrong password and an unknown e-mail with one text", () => {
    expect(loginMessage("invalid_credentials")).toBe(
      "Bitte überprüfen Sie Ihre Zugangsdaten.",
    );
    expect(loginMessage("account_not_confirmed")).toContain(
      "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse",
    );
    // a locked account is no pending confirmation
    expect(loginMessage("account_inactive")).toBe(
      "Dieses Kundenkonto ist gesperrt. Bitte wenden Sie sich an uns.",
    );
  });

  it("names the seconds to wait when the backend says them", () => {
    expect(loginMessage("rate_limited", { retryAfterSeconds: 9.2 })).toBe(
      "Zu viele Anmeldeversuche. Bitte warten Sie 10 Sekunden und versuchen Sie es dann noch einmal.",
    );
    expect(loginMessage("rate_limited")).toContain("einen Moment");
    expect(loginMessage("backend_unavailable")).toContain("später noch einmal");
  });

  it("explains a refused registration", () => {
    expect(registrationMessage("email_taken")).toContain(
      "gibt es schon ein Kundenkonto",
    );
    expect(
      registrationMessage("validation_failed", { fields: ["password"] }),
    ).toContain("Passwort");
    expect(
      registrationMessage("validation_failed", { fields: ["email"] }),
    ).toBe("Bitte prüfen Sie Ihre Angaben.");
    expect(registrationMessage(undefined)).toBe(
      "Bitte versuchen Sie es erneut.",
    );
  });

  it("explains a refused e-mail or password change", () => {
    expect(credentialChangeMessage("invalid_credentials")).toBe(
      "Das Passwort stimmt nicht.",
    );
    expect(credentialChangeMessage("email_taken")).toContain("Kundenkonto");
  });
});
