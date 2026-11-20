import type { ContactMessage } from "../../shared/domain";

/**
 * Restaurant operations: a message from the contact form to the restaurant.
 * Spam checks (honeypot) happen in the storefront before.
 *
 * Shopware: `/contact-form` (mail to the shop's address). Sylius: the
 * contact request endpoint.
 */
export interface ContactPort {
  /**
   * Sends the message; answers the restaurant's own confirmation text, or
   * null for the storefront's default.
   */
  send(
    message: ContactMessage,
  ): Promise<Readonly<{ confirmation: string | null }>>;
}
