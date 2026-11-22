import {
  deepFreeze,
  DomainError,
  type DomainErrorCode,
  type Salutation,
} from "../../../shared/domain";
import type { ContactPort } from "../../ports";
import { deadline, keptFor, REQUEST_TIMEOUT_MS } from "./cart";
import { causeOf, refusedFields } from "./ordering";
import { errorCodes, retryAfter, statusOf } from "./request";
import type { StoreApi } from "./storeApi";

/*
 * Contact messages over Shopware's `/contact-form` (ADR 0001, step 7): the
 * mail goes to the shop's address (`core.basicInformation.email`) with the
 * template `contact_form`, exactly as the 2.x form sent it. Shopware needs
 * a salutation id although its template prints none: a message without one
 * is sent as "not given" (`not_specified`). Fields the visitor left empty
 * are empty strings, as before. Shopware's per-IP limit (`contact_form`)
 * sees the visitor through `X-Forwarded-For` (`TRUSTED_PROXIES`).
 */

type SwSalutation = { id: string; salutationKey?: string | null };

const SALUTATION_TTL_MS = 600_000;

/** Shopware's answer as a domain error; its texts never reach the guest. */
function refusal(error: unknown): DomainError {
  const status = statusOf(error);
  const code: DomainErrorCode =
    status === 429 ||
    errorCodes(error).includes("FRAMEWORK__RATE_LIMIT_EXCEEDED")
      ? "rate_limited"
      : status === 400
        ? "validation_failed"
        : "backend_unavailable";
  const details: Record<string, unknown> = {};
  if (code === "rate_limited") {
    const seconds = retryAfter(error);
    if (seconds) details.retryAfterSeconds = seconds;
  }
  if (code === "validation_failed") {
    details.fields = refusedFields(error).map((field) =>
      field === "comment" ? "message" : field,
    );
  }
  return new DomainError(
    code,
    code === "backend_unavailable"
      ? "Shopware did not answer the contact message."
      : "Shopware refused the contact message.",
    details,
    { cause: causeOf(error) },
  );
}

export function createShopwareContact(
  storeApi: StoreApi,
  options: { requestTimeoutMs?: number } = {},
): ContactPort {
  const timeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const salutations = keptFor<ReadonlyMap<string, string>>(SALUTATION_TTL_MS);

  /** The salutation's id; Shopware requires one, "not given" without. */
  async function salutationId(salutation: Salutation | null): Promise<string> {
    let map = salutations.get("all");
    if (!map) {
      const answer = await deadline(
        storeApi.post<{ elements?: SwSalutation[] }>("/salutation", {
          includes: { salutation: ["id", "salutationKey"] },
        }),
        timeoutMs,
      );
      map = new Map(
        (answer.elements ?? []).flatMap((entry) =>
          entry.salutationKey ? [[entry.salutationKey, entry.id] as const] : [],
        ),
      );
      salutations.set("all", map);
    }
    const id =
      map.get(salutation ?? "not_specified") ?? map.get("not_specified");
    if (!id) {
      throw new DomainError(
        "backend_unavailable",
        "Shopware has no salutation for a contact message.",
      );
    }
    return id;
  }

  return {
    send: async (message, sender) => {
      try {
        const answer = await deadline(
          storeApi.post<{ individualSuccessMessage?: unknown }>(
            "/contact-form",
            {
              salutationId: await salutationId(message.salutation),
              firstName: message.firstName ?? "",
              lastName: message.lastName ?? "",
              email: message.email,
              phone: message.phone ?? "",
              subject: message.subject,
              comment: message.message,
            },
            sender.forwardedFor
              ? { headers: { "x-forwarded-for": sender.forwardedFor } }
              : undefined,
          ),
          timeoutMs,
        );
        const text =
          typeof answer?.individualSuccessMessage === "string"
            ? answer.individualSuccessMessage.trim()
            : "";
        return deepFreeze({ confirmation: text || null });
      } catch (error) {
        if (error instanceof DomainError) throw error;
        throw refusal(error);
      }
    },
  };
}
