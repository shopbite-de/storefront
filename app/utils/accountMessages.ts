/**
 * What the account's forms say when the BFF refuses (ADR 0001, step 6):
 * the storefront's own texts by domain code (`auth.errors.*`, ADR 0002),
 * never the backend's. Each function takes the caller's `t`.
 */

import type { Translate } from "./translate";

const retryAfter = (details: Record<string, unknown>) => {
  const seconds = Number(details.retryAfterSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
};

const tooMany = (
  t: Translate,
  key: "tooManyLogins" | "tooManyAttempts",
  details: Record<string, unknown>,
) => {
  const seconds = retryAfter(details);
  return seconds
    ? t(`auth.errors.${key}`, { seconds })
    : t(`auth.errors.${key}Moment`);
};

export function loginMessage(
  t: Translate,
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  switch (code) {
    case "invalid_credentials":
    case "invalid_value":
      return t("auth.errors.invalidCredentials");
    case "account_not_confirmed":
      return t("auth.errors.accountNotConfirmed");
    case "account_inactive":
      return t("auth.errors.accountInactive");
    case "rate_limited":
      return tooMany(t, "tooManyLogins", details);
    default:
      return t("auth.errors.loginFailed");
  }
}

export function registrationMessage(
  t: Translate,
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  const fields = Array.isArray(details.fields) ? details.fields : [];
  switch (code) {
    case "email_taken":
      return t("auth.errors.emailTakenRegistration");
    case "validation_failed":
      return fields.includes("password")
        ? t("auth.errors.passwordRefused")
        : t("auth.errors.checkDetails");
    case "invalid_value":
      return t("auth.errors.checkDetails");
    default:
      return t("auth.errors.retry");
  }
}

/** The e-mail and password changes of the profile. */
export function credentialChangeMessage(
  t: Translate,
  code: string | undefined,
  details: Record<string, unknown> = {},
): string {
  switch (code) {
    case "invalid_credentials":
      return t("auth.errors.wrongPassword");
    case "email_taken":
      return t("auth.errors.emailTaken");
    case "validation_failed":
    case "invalid_value":
      return t("auth.errors.checkDetails");
    case "rate_limited":
      return tooMany(t, "tooManyAttempts", details);
    default:
      return t("auth.errors.retryLater");
  }
}
