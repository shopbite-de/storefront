import type { ContactForm, ContactMessage } from "../../shared/domain";

/** Who sent a contact message, for the backend's spam limits. */
export type ContactSender = Readonly<{
  /**
   * The visitor's `X-Forwarded-For` chain (the incoming one with the
   * address the request came from), as `BackendSession.forwardedFor`.
   */
  forwardedFor?: string;
}>;

/**
 * Restaurant operations: a message from the contact form to the restaurant
 * (ADR 0001, step 7). Shop-wide: it needs no session. The BFF checks the
 * fields and the honeypot before; the backend may still refuse a message
 * (`validation_failed` with `details.fields`, e.g. a required field left
 * empty) or limit messages per visitor
 * address (`rate_limited` with `details.retryAfterSeconds`).
 *
 * Shopware: `/contact-form` (mail to the shop's address, its per-IP limit
 * through `X-Forwarded-For`). Sylius: the contact request endpoint.
 */
export interface ContactPort {
  /**
   * The fields the restaurant requires beside e-mail, subject and message
   * (Shopware: `core.basicInformation.*FieldRequired`, learnt from the
   * validation of an empty message, which sends nothing).
   */
  getForm(): Promise<ContactForm>;
  /**
   * Sends the message; answers the restaurant's own confirmation text, or
   * null for the storefront's default.
   */
  send(
    message: ContactMessage,
    sender: ContactSender,
  ): Promise<Readonly<{ confirmation: string | null }>>;
}
