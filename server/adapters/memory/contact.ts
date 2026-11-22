import {
  deepFreeze,
  DomainError,
  type ContactForm,
  type ContactMessage,
} from "../../../shared/domain";
import type { ContactPort } from "../../ports";

/** A message the memory backend received, with the sender's address chain. */
export type MemoryContactMessage = Readonly<{
  message: ContactMessage;
  forwardedFor: string | undefined;
}>;

/** Messages per visitor address within the window, like Shopware's first. */
const LIMIT = 3;
const WINDOW_MS = 30_000;
/** Addresses whose recent messages the backend remembers. */
const MAX_SENDERS = 10_000;

/**
 * ContactPort in memory (ADR 0001, step 7): the message is handed to
 * `received` (the demo sends no mail) and the restaurant's confirmation
 * text answered. Fields the seed requires are checked like Shopware does
 * (`validation_failed` with the fields). Three messages per visitor
 * within 30 seconds, then `rate_limited`; the visitor is the client
 * address of the chain (its first entry; the demo trusts the chain).
 */
export function createMemoryContact(options: {
  confirmation?: string | null;
  required?: Partial<ContactForm["required"]>;
  received?: (message: MemoryContactMessage) => void;
  now?: () => number;
}): ContactPort {
  const now = options.now ?? Date.now;
  const confirmation = options.confirmation?.trim() || null;
  const form: ContactForm = deepFreeze({
    required: {
      firstName: options.required?.firstName === true,
      lastName: options.required?.lastName === true,
      phone: options.required?.phone === true,
    },
  });
  const sent = new Map<string, number[]>();

  return {
    getForm: async () => form,

    send: async (message, sender) => {
      const missing = (["firstName", "lastName", "phone"] as const).filter(
        (field) => form.required[field] && !message[field]?.trim(),
      );
      if (missing.length) {
        throw new DomainError(
          "validation_failed",
          "The restaurant requires these fields.",
          { fields: missing },
        );
      }
      const address = sender.forwardedFor?.split(",")[0]?.trim() || "unknown";
      const at = now();
      const recent = (sent.get(address) ?? []).filter(
        (time) => at - time < WINDOW_MS,
      );
      if (recent.length >= LIMIT) {
        throw new DomainError(
          "rate_limited",
          "Too many contact messages from this address.",
          {
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((recent[0]! + WINDOW_MS - at) / 1000),
            ),
          },
        );
      }
      sent.delete(address);
      sent.set(address, [...recent, at]);
      while (sent.size > MAX_SENDERS) sent.delete(sent.keys().next().value!);
      options.received?.(
        deepFreeze({
          message: structuredClone(message),
          forwardedFor: sender.forwardedFor,
        }),
      );
      return deepFreeze({ confirmation });
    },
  };
}
