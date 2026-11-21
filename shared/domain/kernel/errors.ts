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
  /** The cart holds nothing to order. */
  "cart_empty",
  /**
   * An order was sent but its answer did not come, and no order of it can
   * be found yet: it may still arrive. Never placed again automatically.
   */
  "order_status_unknown",
  /**
   * The cart is empty because this session placed an order moments ago
   * (another tab, a reload); `details.orderId` names it. Not a new order.
   */
  "order_already_placed",
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
  /**
   * The account waits for the confirmation of its e-mail (double opt-in);
   * only answered after the right password.
   */
  "account_not_confirmed",
  /** The shop locked the account; only answered after the right password. */
  "account_inactive",
  /** The registration was confirmed before; the customer can log in. */
  "already_confirmed",
  /**
   * The backend refuses more attempts for now (login, password reset);
   * `details.retryAfterSeconds` when it says how long.
   */
  "rate_limited",
  /** The address is a default address of the account and stays. */
  "address_in_use",
  /** The input was rejected by the backend's validation (see `details`). */
  "validation_failed",
  /**
   * The request carried an outdated session (a parallel request replaced
   * it); the browser has the new one, so the request may be sent again.
   */
  "stale_session",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export class DomainError extends Error {
  override readonly name = "DomainError";

  constructor(
    readonly code: DomainErrorCode,
    message: string,
    /** Field names or ids the error is about, e.g. `{ field: "email" }`. */
    readonly details: Readonly<Record<string, unknown>> = {},
    /** `cause`: the backend error behind it, for logs. */
    options?: ErrorOptions,
  ) {
    super(message, options);
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
