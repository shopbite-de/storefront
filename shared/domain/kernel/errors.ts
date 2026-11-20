/**
 * Domain errors (ADR 0001): every port and value object reports a failure
 * the storefront has to react to as a `DomainError` with one of these codes,
 * never as a backend error. Adapters translate their backend's errors into
 * them; the storefront's server routes turn them into HTTP answers.
 */
export const DOMAIN_ERROR_CODES = [
  /** A value object was given a value that breaks its rules. */
  "invalid_value",
  /** The requested dish, section, order, address … does not exist. */
  "not_found",
  /** The selected adapter does not implement this port (yet). */
  "not_implemented",
  /** The backend did not answer or failed; the request may be retried. */
  "backend_unavailable",
  /** The restaurant does not accept orders right now (checkout switch). */
  "ordering_closed",
  /** The wished time is outside the ordering window. */
  "outside_ordering_window",
  /** A dish (or extra) of the cart can no longer be ordered. */
  "dish_unavailable",
  /** The shipping method cannot be used for this cart or address. */
  "shipping_method_blocked",
  /** The payment method cannot be used for this cart. */
  "payment_method_blocked",
  /** The voucher code is unknown or does not apply. */
  "voucher_invalid",
  /** The action needs a logged-in customer. */
  "unauthenticated",
  /** Email and password do not match an account. */
  "invalid_credentials",
  /** An account with this email exists already. */
  "email_taken",
  /** The input was rejected by the backend's validation (see `details`). */
  "validation_failed",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export class DomainError extends Error {
  override readonly name = "DomainError";

  constructor(
    readonly code: DomainErrorCode,
    message: string,
    /** Field names or ids the error is about, e.g. `{ field: "email" }`. */
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export function isDomainError(
  error: unknown,
  code?: DomainErrorCode,
): error is DomainError {
  return (
    error instanceof DomainError && (code === undefined || error.code === code)
  );
}

/** Shorthand for the validating constructors of value objects. */
export function invalidValue(message: string, value: unknown): DomainError {
  return new DomainError("invalid_value", message, { value });
}
