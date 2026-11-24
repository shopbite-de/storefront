import type { H3Event } from "h3";
import {
  DomainError,
  wishedTime,
  type Address,
  type AddressInput,
  type CountryCode,
  type GuestDetails,
  type Salutation,
  type WishedTime,
} from "../../shared/domain";
import type { Backend, BackendSession } from "../ports";
import { shopPath } from "./shopPaths";

/**
 * The checkout behind the BFF (ADR 0001, step 5): routes under
 * `/api/checkout/**` and `/api/orders/**` answer domain types, privately.
 * Reads never create a session; writes come from the storefront's own
 * pages only (CSRF), run one after the other per visitor and answer 409
 * `stale_session` when the cookie is older than a state a parallel request
 * sealed (the browser sends them again).
 */
export async function answerVisitor<T>(
  event: H3Event,
  access: "read" | "write",
  run: (backend: Backend, session: BackendSession) => Promise<T>,
  options: {
    /**
     * A write's answer known already, given even to a request with an
     * outdated session (the order of a double click's first request).
     */
    known?: (backend: Backend, session: BackendSession) => T | undefined;
    /**
     * A read that may change the backend (the wishlist's read moves
     * Shopware's own wishlist): it runs one after the visitor's writes,
     * without a staleness check and without creating a session.
     */
    exclusiveRead?: boolean;
  } = {},
): Promise<T> {
  if (access === "write") assertSameOriginWrite(event);
  answerPrivately(event);
  const backend = useBackend(event);
  return answerDomain(async () => {
    const session = await backendSession(event, backend.name, {
      create: access === "write",
    });
    const visitor = useVisitorSession(event);
    if (access === "read") {
      return options.exclusiveRead
        ? visitor.exclusive(() => run(backend, session))
        : run(backend, session);
    }
    return visitor.exclusive(async () => {
      const answered = options.known?.(backend, session);
      if (answered !== undefined) return answered;
      if (await visitor.isStale()) throw staleSession();
      return run(backend, session);
    });
  });
}

export const staleSession = () =>
  new DomainError("stale_session", "The request carried an outdated session.");

const invalid = (field: string): never => {
  throw new DomainError("invalid_value", `Invalid ${field}.`, { field });
};

/** Refuses a field of a request body (400 `invalid_value`). */
export const invalidField = (field: string): never => invalid(field);

/** The backends' opaque ids; case is kept. */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
/** Control characters other than line breaks and tabs. */
const hasControl = (text: string) =>
  [...text].some((character) => {
    const code = character.charCodeAt(0);
    return (
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      code === 0x7f
    );
  });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY = /^[A-Z]{2}$/;
const SALUTATIONS: readonly Salutation[] = ["mr", "mrs", "not_specified"];

/** Longest text of a field (Shopware keeps names and streets to 255). */
const MAX_TEXT = 255;
const MAX_POSTAL_CODE = 50;
const MAX_PHONE = 40;
/** The checkout's phone rule: at least 7 characters. */
const MIN_PHONE = 7;
export const MAX_NOTE = 500;

export function opaqueId(value: unknown, field: string): string {
  if (typeof value !== "string" || !ID.test(value)) invalid(field);
  return value as string;
}

export function textOf(
  value: unknown,
  field: string,
  { required = false, max = MAX_TEXT, multiline = false } = {},
): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) invalid(field);
    return null;
  }
  if (typeof value !== "string" || value.length > max) invalid(field);
  const text = value as string;
  // single-line fields: no line break of any kind (CR, LF, tab, NEL, the
  // Unicode line and paragraph separators)
  if (
    hasControl(text) ||
    (!multiline && /[\r\n\t\u0085\u2028\u2029]/.test(text))
  ) {
    invalid(field);
  }
  if (required && !text.trim()) invalid(field);
  return text;
}

const required = (value: unknown, field: string, max = MAX_TEXT) =>
  textOf(value, field, { required: true, max })!;

function phoneOf(value: unknown, field: string): string | null {
  const phone = textOf(value, field, { max: MAX_PHONE });
  if (phone !== null && phone.trim().length < MIN_PHONE) invalid(field);
  return phone;
}

export function salutationOf(value: unknown, field: string): Salutation | null {
  if (value === undefined || value === null) return null;
  if (!SALUTATIONS.includes(value as Salutation)) invalid(field);
  return value as Salutation;
}

/** A country code, or null for the shop's own country. */
function countryOf(value: unknown, field: string): CountryCode | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !COUNTRY.test(value)) invalid(field);
  return value as string;
}

/** An address as the checkout sends it (without id). */
export function addressInput(
  body: unknown,
  field: string,
  options: { names: boolean },
): AddressInput {
  if (!body || typeof body !== "object") invalid(field);
  const input = body as Record<string, unknown>;
  const name = (key: string) =>
    options.names
      ? required(input[key], `${field}.${key}`)
      : (textOf(input[key], `${field}.${key}`) ?? "");
  return {
    salutation: salutationOf(input.salutation, `${field}.salutation`),
    firstName: name("firstName"),
    lastName: name("lastName"),
    company: textOf(input.company, `${field}.company`),
    department: textOf(input.department, `${field}.department`),
    street: required(input.street, `${field}.street`),
    additionalLine: textOf(input.additionalLine, `${field}.additionalLine`),
    postalCode:
      textOf(input.postalCode, `${field}.postalCode`, {
        max: MAX_POSTAL_CODE,
      }) ?? "",
    city: required(input.city, `${field}.city`),
    country: countryOf(input.country, `${field}.country`),
    phone: phoneOf(input.phone, `${field}.phone`),
  };
}

/** An e-mail address as the checkout and the account take it. */
export function emailOf(value: unknown, field = "email"): string {
  const email = required(value, field, 254);
  if (!EMAIL.test(email)) invalid(field);
  return email;
}

/** `POST /api/checkout/guest`: the guest's details (`GuestDetails`). */
export function guestBody(body: unknown): GuestDetails {
  if (!body || typeof body !== "object") invalid("body");
  const input = body as Record<string, unknown>;
  const email = emailOf(input.email);
  if (input.business !== undefined && typeof input.business !== "boolean") {
    invalid("business");
  }
  const business = input.business === true;
  const firstName = required(input.firstName, "firstName");
  const lastName = required(input.lastName, "lastName");
  const given = addressInput(input.billingAddress, "billingAddress", {
    names: false,
  });
  // the billing address carries the guest's names unless it has its own
  const billingAddress = {
    ...given,
    firstName: given.firstName || firstName,
    lastName: given.lastName || lastName,
  };
  // the checkout's rules: a phone number to call back, a business's company
  if (billingAddress.phone === null) invalid("billingAddress.phone");
  if (business && !billingAddress.company?.trim()) {
    invalid("billingAddress.company");
  }
  const deliveryAddress =
    input.deliveryAddress === undefined || input.deliveryAddress === null
      ? null
      : addressInput(input.deliveryAddress, "deliveryAddress", {
          names: true,
        });
  return {
    email,
    salutation: salutationOf(input.salutation, "salutation"),
    firstName,
    lastName,
    business,
    billingAddress,
    deliveryAddress,
  };
}

/** `PATCH /api/checkout/orderer/addresses/[addressId]`. */
export function addressBody(id: string, body: unknown): Address {
  const address = addressInput(body, "address", { names: true });
  // an empty country keeps the address's (the adapter knows it)
  return { id, ...address, country: address.country ?? "" };
}

/** `POST /api/checkout/selection`: one of the two methods. */
export function selectionBody(
  body: unknown,
): { shippingMethodId: string } | { paymentMethodId: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const shipping = input.shippingMethodId;
  const payment = input.paymentMethodId;
  if ((shipping === undefined) === (payment === undefined)) invalid("body");
  return shipping !== undefined
    ? { shippingMethodId: opaqueId(shipping, "shippingMethodId") }
    : { paymentMethodId: opaqueId(payment, "paymentMethodId") };
}

/** One placement attempt of the browser (sent again on a retry). */
const ATTEMPT = /^[A-Za-z0-9_-]{8,64}$/;

export type PlaceOrderInput = Readonly<{
  attemptId: string;
  wishedTime: WishedTime;
  note: string | null;
}>;

/** `POST /api/checkout/orders`: `{ attemptId, wishedTime: { date, time }, note? }`. */
export function placeOrderBody(body: unknown): PlaceOrderInput {
  if (!body || typeof body !== "object") invalid("body");
  const input = body as Record<string, unknown>;
  if (typeof input.attemptId !== "string" || !ATTEMPT.test(input.attemptId)) {
    invalid("attemptId");
  }
  const wished = input.wishedTime as Record<string, unknown> | undefined;
  if (
    !wished ||
    typeof wished.date !== "string" ||
    (typeof wished.time !== "string" && typeof wished.time !== "object")
  ) {
    invalid("wishedTime");
  }
  let value: WishedTime;
  try {
    value = wishedTime(
      wished!.date as string,
      wished!.time as string | { minutes: number },
    );
  } catch {
    return invalid("wishedTime");
  }
  return {
    attemptId: input.attemptId as string,
    wishedTime: value,
    note:
      textOf(input.note, "note", { max: MAX_NOTE, multiline: true })?.trim() ||
      null,
  };
}

/** `POST /api/orders/[orderId]/payment`: `{ paymentMethodId? }`. */
export function paymentBody(body: unknown): { paymentMethodId: string | null } {
  const input = (body ?? {}) as Record<string, unknown>;
  return {
    paymentMethodId:
      input.paymentMethodId === undefined || input.paymentMethodId === null
        ? null
        : opaqueId(input.paymentMethodId, "paymentMethodId"),
  };
}

/**
 * Where the guest orders, for the backend's e-mail links: the origin the
 * browser sent (checked by `assertSameOriginWrite`), else
 * `public.storeUrl`. The Shopware adapter matches it against the sales
 * channel's domains (the layer's `devStorefrontUrl` is gone since 3.0).
 */
export function storefrontUrl(event: H3Event): string {
  return (
    getRequestHeader(event, "origin") ||
    useRuntimeConfig().public.storeUrl ||
    ""
  );
}

/** The storefront's own URLs of an order's payment result. */
export function paymentUrls(orderId: string): {
  success: string;
  failure: string;
} {
  const base = (useRuntimeConfig().public.storeUrl ?? "").replace(/\/+$/, "");
  return {
    success: `${base}${shopPath("bestellung-id-erfolg", { id: orderId })}`,
    failure: `${base}${shopPath("bestellung-id-fehler", { id: orderId })}`,
  };
}
