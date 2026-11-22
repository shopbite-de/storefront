import {
  deepFreeze,
  DomainError,
  type ContactForm,
  type DomainErrorCode,
  type Salutation,
} from "../../../shared/domain";
import type { ContactPort } from "../../ports";
import { deadline, keptFor, REQUEST_TIMEOUT_MS } from "./cart";
import { causeOf, refusedFields } from "./ordering";
import { errorCodes, retryAfter, statusOf } from "./request";
import type { AdapterLog } from "./shop";
import type { StoreApi, VisitorStoreApi } from "./storeApi";

/*
 * Contact messages over Shopware's `/contact-form` (ADR 0001, step 7): the
 * mail goes to the shop's address (`core.basicInformation.email`) with the
 * template `contact_form`, exactly as the 2.x form sent it. Shopware needs
 * a salutation id although its template prints none: a message without one
 * is sent as "not given" (`not_specified`). Fields the visitor left empty
 * are empty strings, as before. The requests go to the server's endpoint
 * with the visitor's `X-Forwarded-For` (`ContactTransport`), so Shopware's
 * per-IP limit (`contact_form`) sees the visitor (`TRUSTED_PROXIES`).
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
      field === "comment"
        ? "message"
        : field === "salutationId"
          ? "salutation"
          : field,
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

/**
 * How the contact adapter reaches `/contact-form`: through the server's
 * endpoint with the visitor's address chain (the visitor transport without
 * a token, like the removed bridge did), so Shopware's per-IP limit sees the
 * visitor also when the public endpoint sits behind a proxy of its own.
 */
export type ContactTransport = <T>(
  path: string,
  body: Record<string, unknown>,
  forwardedFor?: string,
) => Promise<T>;

/** A transport over the shop-wide Store API (tests, no visitor transport). */
export const contactOverStoreApi =
  (storeApi: StoreApi): ContactTransport =>
  (path, body, forwardedFor) =>
    forwardedFor
      ? storeApi.post(path, body, {
          headers: { "x-forwarded-for": forwardedFor },
        })
      : storeApi.post(path, body);

/** A transport over the visitor's Store API (the server endpoint). */
export const contactOverVisitorApi =
  (visitorApi: VisitorStoreApi): ContactTransport =>
  async <T>(
    path: string,
    body: Record<string, unknown>,
    forwardedFor?: string,
  ) =>
    (
      await visitorApi.send<T>({
        method: "POST",
        path,
        body,
        ...(forwardedFor ? { forwardedFor } : {}),
      })
    ).data;

const OPTIONAL: ContactForm = deepFreeze({
  required: { firstName: false, lastName: false, phone: false },
});

/** The fields Shopware's validation of an empty message names as blank. */
const REQUIRABLE = ["firstName", "lastName", "phone"] as const;

export function createShopwareContact(
  send: ContactTransport,
  options: {
    requestTimeoutMs?: number;
    log?: AdapterLog;
    /**
     * The ShopBite plugin's configuration (`/shopbite/config`): a plugin
     * that names the required contact fields is preferred over the probe.
     */
    pluginConfig?: () => Promise<Record<string, unknown>>;
  } = {},
): ContactPort {
  const timeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const log = options.log ?? (() => {});
  const salutations = keptFor<ReadonlyMap<string, string>>(SALUTATION_TTL_MS);
  /** The read in flight: reads at the same time share one probe. */
  let reading: Promise<ContactForm> | null = null;

  /**
   * The salutation's id; Shopware requires one: "not given" without, the
   * first one when the shop has no "not given".
   */
  async function salutationId(salutation: Salutation | null): Promise<string> {
    let map = salutations.get("all");
    if (!map) {
      const answer = await deadline(
        send<{ elements?: SwSalutation[] }>("/salutation", {
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
      map.get(salutation ?? "not_specified") ??
      map.get("not_specified") ??
      map.values().next().value;
    if (!id) {
      throw new DomainError(
        "backend_unavailable",
        "Shopware has no salutation for a contact message.",
      );
    }
    return id;
  }

  /**
   * Shopware's settings `core.basicInformation.firstNameFieldRequired`,
   * `lastNameFieldRequired` and `phoneNumberFieldRequired`: from the ShopBite
   * plugin's configuration when it names them, else learnt from an empty
   * message, since Shopware validates before its limit and sends nothing for
   * a refused message. Nothing is kept here: the BFF caches the answer
   * (`contact-form`, emptied by every purge); when Shopware cannot tell,
   * nothing is required (as the form said before).
   */
  async function fromPlugin(): Promise<ContactForm | null> {
    if (!options.pluginConfig) return null;
    const config = await deadline(options.pluginConfig(), timeoutMs);
    const flags = [
      config?.firstNameFieldRequired,
      config?.lastNameFieldRequired,
      config?.phoneNumberFieldRequired,
    ];
    if (!flags.every((flag) => typeof flag === "boolean")) return null;
    return deepFreeze({
      required: {
        firstName: flags[0] as boolean,
        lastName: flags[1] as boolean,
        phone: flags[2] as boolean,
      },
    });
  }

  async function readForm(): Promise<ContactForm> {
    const named = await fromPlugin().catch(() => null);
    if (named) return named;
    try {
      await deadline(send("/contact-form", {}), timeoutMs);
    } catch (error) {
      if (statusOf(error) === 400) {
        const blank = new Set(refusedFields(error));
        return deepFreeze({
          required: {
            firstName: blank.has(REQUIRABLE[0]),
            lastName: blank.has(REQUIRABLE[1]),
            phone: blank.has(REQUIRABLE[2]),
          },
        });
      }
      throw error;
    }
    // an empty message accepted: nothing is required
    return OPTIONAL;
  }

  return {
    getForm: () => {
      reading ??= readForm()
        .catch((error: unknown) => {
          log(
            "[shopware][contact] the contact form's fields could not be read",
            { status: statusOf(error), codes: errorCodes(error) },
          );
          return OPTIONAL;
        })
        .finally(() => {
          reading = null;
        });
      return reading;
    },

    send: async (message, sender) => {
      try {
        const answer = await deadline(
          send<{ individualSuccessMessage?: unknown }>(
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
            sender.forwardedFor,
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
