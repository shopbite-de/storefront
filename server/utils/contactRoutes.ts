import type { H3Event } from "h3";
import { DomainError, type ContactMessage } from "../../shared/domain";
import type { ContactSender } from "../ports";
import { forwardedFor } from "../session/forwardedFor";
import { emailOf, salutationOf, textOf } from "./checkoutRoutes";

/*
 * Contact messages behind the BFF (ADR 0001, step 7): `POST /api/contact`
 * checks the fields as the contact form does (e-mail, a subject of at
 * least 3 and a message of at least 10 characters), refuses control
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

/** The body of `POST /api/contact`, or `spam` for a filled honeypot. */
export function contactBody(body: unknown): ContactMessage | "spam" {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    invalid("body");
  }
  const input = body as Record<string, unknown>;
  // the hidden field of the form: only a bot fills it in
  if (typeof input.hp === "string" && input.hp !== "") return "spam";
  const subject = textOf(input.subject, "subject", { required: true })!;
  if (subject.length < MIN_SUBJECT) invalid("subject");
  const message = textOf(input.message, "message", {
    required: true,
    max: MAX_MESSAGE,
    multiline: true,
  })!;
  if (message.length < MIN_MESSAGE) invalid("message");
  return {
    salutation: salutationOf(input.salutation, "salutation"),
    firstName: textOf(input.firstName, "firstName"),
    lastName: textOf(input.lastName, "lastName"),
    email: emailOf(input.email),
    phone: textOf(input.phone, "phone"),
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
