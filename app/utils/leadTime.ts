/**
 * Lead times per shipping method (shopbite#6), from the shop's shipping
 * methods (`/api/checkout/shipping-methods`, CheckoutPort): whether a
 * method is a delivery or a pickup and how many minutes the kitchen needs.
 * Also imported by the server (llms.txt), so it stays free of Nuxt imports.
 */
import type { Fulfillment, ShippingMethod } from "../../shared/domain";

export type ShippingLeadTime = {
  fulfillment: Fulfillment;
  minutes: number | null;
};

type Methods = readonly ShippingMethod[] | null | undefined;

/**
 * Fulfillment and lead time of a shipping method. A method the shop does
 * not list (or none, or no list yet) counts as delivery without a lead
 * time.
 */
export function shippingLeadTime(
  methods: Methods,
  methodId: string | null | undefined,
): ShippingLeadTime {
  const method = methodId
    ? methods?.find((candidate) => candidate.id === methodId)
    : undefined;
  return method
    ? {
        fulfillment: method.fulfillment,
        minutes: method.leadTime?.minutes ?? null,
      }
    : { fulfillment: "delivery", minutes: null };
}

/**
 * Lead time of the first shipping method of a fulfillment, for texts that
 * are not about a selected method (home page, llms.txt); `null` when the
 * shop has no such method or it has no lead time.
 */
export function fulfillmentLeadTime(
  methods: Methods,
  fulfillment: Fulfillment,
): number | null {
  return (
    methods?.find((method) => method.fulfillment === fulfillment)?.leadTime
      ?.minutes ?? null
  );
}

/** German wording of the time choice per fulfillment. */
export const FULFILLMENT_WORDING = {
  delivery: {
    wishedTime: "Wunschlieferzeit",
    time: "Lieferzeit",
    times: "Lieferzeiten",
    leadTimeHint: (minutes: number) =>
      `Lieferzeit ca. ${minutes} Minuten, zu Stoßzeiten kann es etwas länger dauern.`,
  },
  pickup: {
    wishedTime: "Wunschabholzeit",
    time: "Abholzeit",
    times: "Abholzeiten",
    leadTimeHint: (minutes: number) =>
      `Abholbereit in ca. ${minutes} Minuten, zu Stoßzeiten kann es etwas länger dauern.`,
  },
} as const satisfies Record<Fulfillment, unknown>;

/**
 * The order's customer comment carries the wished time, e.g.
 * "Wunschabholzeit: 18:40" (read by the receipt printer and the backoffice).
 */
export function wishedTimeComment(
  fulfillment: Fulfillment,
  time: string,
): string {
  return `${FULFILLMENT_WORDING[fulfillment].wishedTime}: ${time}`;
}

/**
 * The wished time of a customer comment; both prefixes are accepted (orders
 * before shopbite#6 always say "Wunschlieferzeit"). Other comments are
 * returned as they are.
 */
export function parseWishedTime(
  comment: string | null | undefined,
): string | undefined {
  if (!comment) return undefined;
  return comment
    .trim()
    .replace(/^Wunsch(?:liefer|abhol)zeit:\s*/, "")
    .trim();
}
