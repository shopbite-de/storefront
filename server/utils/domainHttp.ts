import { isDomainError, type DomainErrorCode } from "../../shared/domain";

/**
 * The HTTP answer of every BFF route for a DomainError (ADR 0001): one
 * mapping for all routes, so the app reacts to codes, not to backends.
 */
export const DOMAIN_ERROR_STATUS: Readonly<Record<DomainErrorCode, number>> = {
  invalid_value: 400,
  not_found: 404,
  not_implemented: 501,
  backend_unavailable: 503,
  ordering_closed: 409,
  outside_ordering_window: 422,
  cart_empty: 409,
  order_status_unknown: 409,
  order_already_placed: 409,
  dish_unavailable: 409,
  shipping_method_blocked: 409,
  payment_method_blocked: 409,
  voucher_invalid: 422,
  unauthenticated: 401,
  invalid_credentials: 401,
  email_taken: 409,
  validation_failed: 422,
  stale_session: 409,
};

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Content",
  501: "Not Implemented",
  503: "Service Unavailable",
};

/**
 * A DomainError as an HTTP error with `data: { code, details }`; its
 * message and cause (backend details) stay in the server log. Other errors
 * (e.g. the 503 of a resilient loader) are returned unchanged.
 */
export function toHttpError(error: unknown): unknown {
  if (!isDomainError(error)) return error;
  const statusCode = DOMAIN_ERROR_STATUS[error.code];
  if (statusCode >= 500) console.error(`[bff] ${error.code}`, error);
  return createError({
    statusCode,
    statusMessage: STATUS_MESSAGES[statusCode] ?? "Error",
    data: {
      code: error.code,
      ...(Object.keys(error.details).length && statusCode < 500
        ? { details: error.details }
        : {}),
    },
  });
}

/** Runs a route's port call and maps a DomainError to its HTTP answer. */
export async function answerDomain<T>(answer: () => Promise<T>): Promise<T> {
  try {
    return await answer();
  } catch (error) {
    throw toHttpError(error);
  }
}
