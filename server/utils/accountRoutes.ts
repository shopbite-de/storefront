import type { AccountAddress, ProfileChange, Registration } from "../ports";
import {
  addressInput,
  emailOf,
  guestBody,
  invalidField,
  opaqueId,
  salutationOf,
  textOf,
} from "./checkoutRoutes";

/*
 * The customer's account behind the BFF (ADR 0001, step 6): routes under
 * `/api/account/**` answer domain types privately through `answerVisitor`
 * (CSRF, writes one after the other per visitor, 409 `stale_session`).
 * Passwords are read from the body, handed to the port and never logged
 * or answered; a body the storefront's forms would not send is 400 with
 * the field in `data.details.field`.
 */

/** Longer passwords are no password of the storefront's forms. */
export const MAX_PASSWORD = 4096;

const asObject = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    invalidField("body");
  }
  return body as Record<string, unknown>;
};

/** A password as typed: any characters, not empty, not absurdly long. */
export function passwordOf(value: unknown, field = "password"): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_PASSWORD
  ) {
    invalidField(field);
  }
  return value as string;
}

/** `POST /api/account/login`: `{ email, password }`. */
export function loginBody(body: unknown): { email: string; password: string } {
  const input = asObject(body);
  return {
    email: emailOf(input.email),
    password: passwordOf(input.password),
  };
}

/** `POST /api/account/register`: the guest's details plus `password`. */
export function registrationBody(body: unknown): Registration {
  const input = asObject(body);
  return { ...guestBody(input), password: passwordOf(input.password) };
}

/** Link parameters the confirmation takes: names and values stay small. */
const LINK_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const LINK_VALUE = /^[A-Za-z0-9_.~+/=-]{1,512}$/;

/**
 * `POST /api/account/register/confirm`: the query parameters of the
 * e-mail link as they came (opaque to the BFF), at most eight.
 */
export function confirmationBody(body: unknown): Record<string, string> {
  const input = asObject(body);
  const entries = Object.entries(input);
  if (entries.length === 0 || entries.length > 8) invalidField("body");
  return Object.fromEntries(
    entries.map(([key, value]) => {
      if (
        !LINK_KEY.test(key) ||
        typeof value !== "string" ||
        !LINK_VALUE.test(value)
      ) {
        invalidField(key);
      }
      return [key, value as string];
    }),
  );
}

/** `POST /api/account/password-reset`: `{ email }`. */
export function resetRequestBody(body: unknown): { email: string } {
  return { email: emailOf(asObject(body).email) };
}

/** `POST /api/account/password-reset/confirm`: `{ token, newPassword }`. */
export function resetBody(body: unknown): {
  token: string;
  newPassword: string;
} {
  const input = asObject(body);
  const token = input.token;
  if (typeof token !== "string" || !LINK_VALUE.test(token)) {
    invalidField("token");
  }
  return {
    token: token as string,
    newPassword: passwordOf(input.newPassword, "newPassword"),
  };
}

/** `PATCH /api/account/profile`: `{ salutation?, firstName, lastName }`. */
export function profileBody(body: unknown): ProfileChange {
  const input = asObject(body);
  return {
    salutation: salutationOf(input.salutation, "salutation"),
    firstName: textOf(input.firstName, "firstName", { required: true })!,
    lastName: textOf(input.lastName, "lastName", { required: true })!,
  };
}

/** `POST /api/account/email`: `{ email, password }`. */
export function emailChangeBody(body: unknown): {
  email: string;
  password: string;
} {
  const input = asObject(body);
  return {
    email: emailOf(input.email),
    password: passwordOf(input.password),
  };
}

/** `POST /api/account/password`: `{ currentPassword, newPassword }`. */
export function passwordChangeBody(body: unknown): {
  currentPassword: string;
  newPassword: string;
} {
  const input = asObject(body);
  return {
    currentPassword: passwordOf(input.currentPassword, "currentPassword"),
    newPassword: passwordOf(input.newPassword, "newPassword"),
  };
}

/**
 * An address of the account (`POST /api/account/addresses`, `PATCH
 * /api/account/addresses/[addressId]`): names required, no country is
 * the shop's (a change keeps the address's).
 */
export function accountAddressBody(
  id: string | null,
  body: unknown,
): AccountAddress {
  const address = addressInput(asObject(body), "address", { names: true });
  return { ...address, id };
}

/** `POST /api/account/addresses/[addressId]/default`: `{ use }`. */
export function defaultUseBody(body: unknown): "billing" | "delivery" {
  const use = asObject(body).use;
  if (use !== "billing" && use !== "delivery") invalidField("use");
  return use as "billing" | "delivery";
}

/** An address id of the route. */
export const addressIdParam = (value: unknown) => opaqueId(value, "addressId");

/** `GET /api/account/orders?page=`: 1 to 1000. */
export function orderPageParam(value: unknown): number {
  if (value === undefined || value === "") return 1;
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    invalidField("page");
  }
  return page;
}

/** Orders on one page of the account's list (the Store API serves at most 100). */
export const ORDERS_PER_PAGE = 100;
