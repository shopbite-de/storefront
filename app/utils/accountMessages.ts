/**
 * What the account's forms say when the BFF refuses (ADR 0001, step 6):
 * the storefront's own German texts by domain code, never the backend's.
 */

const retryAfter = (details: Record<string, unknown>) => {
  const seconds = Number(details.retryAfterSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
};

const tooMany = (what: string, details: Record<string, unknown>) => {
  const seconds = retryAfter(details);
  return seconds
    ? `Zu viele ${what}. Bitte warten Sie ${seconds} Sekunden und versuchen Sie es dann noch einmal.`
    : `Zu viele ${what}. Bitte warten Sie einen Moment und versuchen Sie es dann noch einmal.`;
};

export function loginMessage(
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  switch (code) {
    case "invalid_credentials":
    case "invalid_value":
      return "Bitte überprüfen Sie Ihre Zugangsdaten.";
    case "account_not_confirmed":
      return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse mit dem Link aus unserer E-Mail.";
    case "account_inactive":
      return "Dieses Kundenkonto ist gesperrt. Bitte wenden Sie sich an uns.";
    case "rate_limited":
      return tooMany("Anmeldeversuche", details);
    default:
      return "Die Anmeldung hat gerade nicht geklappt. Bitte versuchen Sie es später noch einmal.";
  }
}

export function registrationMessage(
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  const fields = Array.isArray(details.fields) ? details.fields : [];
  switch (code) {
    case "email_taken":
      return "Unter dieser E-Mail-Adresse gibt es schon ein Kundenkonto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.";
    case "validation_failed":
      return fields.includes("password")
        ? "Das Passwort wird nicht akzeptiert. Bitte wählen Sie ein längeres Passwort."
        : "Bitte prüfen Sie Ihre Angaben.";
    case "invalid_value":
      return "Bitte prüfen Sie Ihre Angaben.";
    default:
      return "Bitte versuchen Sie es erneut.";
  }
}

/** The e-mail and password changes of the profile. */
export function credentialChangeMessage(
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  switch (code) {
    case "invalid_credentials":
      return "Das Passwort stimmt nicht.";
    case "email_taken":
      return "Unter dieser E-Mail-Adresse gibt es schon ein Kundenkonto.";
    case "validation_failed":
    case "invalid_value":
      return "Bitte prüfen Sie Ihre Angaben.";
    case "rate_limited":
      return tooMany("Versuche", details);
    default:
      return "Bitte versuchen Sie es später noch einmal.";
  }
}
