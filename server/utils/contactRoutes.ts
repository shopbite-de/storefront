import type { H3Event } from "h3";
import {
  DomainError,
  type ContactForm,
  type ContactMessage,
} from "../../shared/domain";
import type { ContactSender } from "../ports";
import { forwardedFor } from "../session/forwardedFor";
import { emailOf, salutationOf, textOf } from "./checkoutRoutes";

/*
 * Contact messages behind the BFF (ADR 0001, step 7): `POST /api/contact`
 * checks the fields as the contact form does (e-mail, a subject of at
 * least 3 and a message of at least 10 characters, without the spaces
 * around them; the fields the restaurant requires), refuses control
 * characters and line breaks outside the message (no header injection
 * through names, e-mail or subject) and answers a filled honeypot like a
 * sent message without sending it. The backend's per-IP limit sees the
 * visitor through the address chain (`X-Forwarded-For`).
 */

/** Shortest subject and message the contact form accepts. */
export const MIN_SUBJECT = 3;
export const MIN_MESSAGE = 10;
/** Longer messages are no message of the contact form. */
export const MAX_MESSAGE = 10_000;

const invalid = (field: string): never => {
  throw new DomainError("invalid_value", `Invalid ${field}.`, { field });
};

/** Nothing required beside e-mail, subject and message. */
export const OPTIONAL_CONTACT_FORM: ContactForm = {
  required: { firstName: false, lastName: false, phone: false },
};

/**
 * The body of `POST /api/contact`, or `spam` for a filled honeypot. The
 * fields the restaurant requires (`form`) must not be blank; the shortest
 * subject and message count without the spaces around them.
 */
export function contactBody(
  body: unknown,
  form: ContactForm = OPTIONAL_CONTACT_FORM,
): ContactMessage | "spam" {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    invalid("body");
  }
  const input = body as Record<string, unknown>;
  // the hidden field of the form: only a bot fills it in, with anything
  if (input.hp !== undefined && input.hp !== null && input.hp !== "") {
    return "spam";
  }
  const subject = textOf(input.subject, "subject", { required: true })!;
  if (subject.trim().length < MIN_SUBJECT) invalid("subject");
  const message = textOf(input.message, "message", {
    required: true,
    max: MAX_MESSAGE,
    multiline: true,
  })!;
  if (message.trim().length < MIN_MESSAGE) invalid("message");
  const optional = (field: "firstName" | "lastName" | "phone") => {
    const value = textOf(input[field], field, {
      required: form.required[field],
    });
    return value?.trim() ? value : null;
  };
  return {
    salutation: salutationOf(input.salutation, "salutation"),
    firstName: optional("firstName"),
    lastName: optional("lastName"),
    email: emailOf(input.email),
    phone: optional("phone"),
    subject,
    message,
  };
}

/** The sender of a request: its address chain for the backend's limits. */
export function contactSender(event: H3Event): ContactSender {
  const chain = forwardedFor(
    getRequestHeader(event, "x-forwarded-for"),
    event.node?.req?.socket?.remoteAddress,
  );
  return chain ? { forwardedFor: chain } : {};
}
