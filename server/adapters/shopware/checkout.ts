import type { components } from "../../../api-types/storeApiTypes";
import {
  deepFreeze,
  leadTime,
  type Fulfillment,
  type LeadTime,
  type Media,
  type ShippingMethod,
} from "../../../shared/domain";
import type { CheckoutPort } from "../../ports";
import { partlyImplemented } from "../notImplemented";
import { call, type AdapterLog } from "./shop";
import type { StoreApi } from "./storeApi";

type Schemas = components["schemas"];
type PluginMethod = Partial<
  Schemas["ShopBiteConfig"]["shippingMethods"][number]
>;

/** Only the fields the domain needs (Store API includes). */
export const SHIPPING_METHOD_CRITERIA = {
  associations: { media: {} },
  includes: {
    shipping_method: ["id", "name", "description", "translated", "media"],
    media: ["url", "alt", "translated", "metaData", "thumbnails"],
    media_thumbnail: ["url", "width"],
  },
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isFulfillment = (value: unknown): value is Fulfillment =>
  value === "delivery" || value === "pickup";

export function toMedia(
  media: Schemas["Media"] | null | undefined,
): Media | null {
  if (!media?.url) return null;
  const meta = (media.metaData ?? {}) as { width?: unknown; height?: unknown };
  const size = (value: unknown) =>
    typeof value === "number" && value > 0 ? value : null;
  return {
    url: media.url,
    alt: text(media.translated?.alt ?? media.alt),
    width: size(meta.width),
    height: size(meta.height),
    sources: (media.thumbnails ?? []).flatMap((thumbnail) =>
      thumbnail.url && size(thumbnail.width)
        ? [{ url: thumbnail.url, width: thumbnail.width as number }]
        : [],
    ),
  };
}

/**
 * The shop's shipping methods: the Store API names them in the shop's
 * order, the ShopBite plugin's configuration adds fulfillment and lead
 * time per method. A method the plugin does not list is a delivery without
 * a lead time (as the storefront always read it); a lead time the domain
 * cannot express is logged and left unknown.
 */
export function toShippingMethods(
  methods: readonly Schemas["ShippingMethod"][],
  pluginMethods: readonly PluginMethod[],
  log: AdapterLog,
): ShippingMethod[] {
  return methods.flatMap((method) => {
    if (!method.id) return [];
    const entry = pluginMethods.find((candidate) => candidate.id === method.id);
    let lead: LeadTime | null = null;
    if (entry && entry.leadTimeMinutes !== undefined) {
      try {
        lead = leadTime(entry.leadTimeMinutes);
      } catch {
        log("Shopware: dropped a lead time it cannot read.", entry);
      }
    }
    return [
      {
        id: method.id,
        name: text(method.translated?.name) ?? text(method.name) ?? "",
        description:
          text(method.translated?.description) ?? text(method.description),
        fulfillment: isFulfillment(entry?.fulfillment)
          ? entry.fulfillment
          : "delivery",
        leadTime: lead,
        media: toMedia(method.media),
      },
    ];
  });
}

/**
 * CheckoutPort over the Store API and the ShopBite plugin. Step 1 of ADR
 * 0001 needs the shipping methods only (lead times for the home page,
 * llms.txt and the wished time); the rest follows in step 5.
 */
export function createShopwareCheckout(
  storeApi: StoreApi,
  options: Readonly<{ name: string; log: AdapterLog }>,
): CheckoutPort {
  return partlyImplemented("checkout", options.name, {
    listShippingMethods: async () => {
      const [config, methods] = await Promise.all([
        call("/shopbite/config", () =>
          storeApi.get<Partial<Schemas["ShopBiteConfig"]>>("/shopbite/config"),
        ),
        call("/shipping-method", () =>
          storeApi.post<{ elements?: Schemas["ShippingMethod"][] }>(
            "/shipping-method",
            SHIPPING_METHOD_CRITERIA,
          ),
        ),
      ]);
      return deepFreeze(
        toShippingMethods(
          methods.elements ?? [],
          config.shippingMethods ?? [],
          options.log,
        ),
      );
    },
  });
}
