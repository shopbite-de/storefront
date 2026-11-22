import {
  deepFreeze,
  DomainError,
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
 * text answered. Three messages per visitor address (the nearest entry of
 * the address chain) within 30 seconds, then `rate_limited`.
 */
export function createMemoryContact(options: {
  confirmation?: string | null;
  received?: (message: MemoryContactMessage) => void;
  now?: () => number;
}): ContactPort {
  const now = options.now ?? Date.now;
  const confirmation = options.confirmation?.trim() || null;
  const sent = new Map<string, number[]>();

  return {
    send: async (message, sender) => {
      const address =
        sender.forwardedFor?.split(",").at(-1)?.trim() || "unknown";
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
