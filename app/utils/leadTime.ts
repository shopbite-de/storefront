/**
 * Lead times per shipping method (shopbite#6): the ShopBite plugin reports
 * for every active shipping method of the sales channel whether it is a
 * delivery or a pickup and how many minutes the kitchen needs
 * (`shippingMethods` of `/store-api/shopbite/config`). Also imported by the
 * server (llms.txt), so it stays free of Nuxt imports.
 */
export type Fulfillment = "delivery" | "pickup";

export type ShippingMethodLeadTime = {
  id: string;
  fulfillment: Fulfillment;
  leadTimeMinutes: number;
};

export type LeadTimeConfig =
  | { shippingMethods?: readonly ShippingMethodLeadTime[] | null }
  | null
  | undefined;

export type LeadTime = { fulfillment: Fulfillment; minutes: number | null };

/**
 * Fulfillment and lead time of a shipping method. A method the plugin does
 * not list (or none, or no configuration yet) counts as delivery without a
 * lead time.
 */
export function shippingLeadTime(
  config: LeadTimeConfig,
  method: { id?: string } | null | undefined,
): LeadTime {
  const entry = method?.id
    ? config?.shippingMethods?.find((item) => item.id === method.id)
    : undefined;
  return entry
    ? { fulfillment: entry.fulfillment, minutes: entry.leadTimeMinutes }
    : { fulfillment: "delivery", minutes: null };
}

/**
 * Lead time of the first shipping method of a fulfillment, for texts that
 * are not about a selected method (home page, llms.txt); `null` when the
 * sales channel has no such method.
 */
export function fulfillmentLeadTime(
  config: LeadTimeConfig,
  fulfillment: Fulfillment,
): number | null {
  return (
    config?.shippingMethods?.find((item) => item.fulfillment === fulfillment)
      ?.leadTimeMinutes ?? null
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
