import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import type {
  PaymentMethod,
  ShippingMethod,
} from "~~/app/types/commerce/checkout";

type SwPaymentMethod = components["schemas"]["PaymentMethod"];
type SwShippingMethod = components["schemas"]["ShippingMethod"];

export function toPaymentMethod(sw: SwPaymentMethod): PaymentMethod {
  const media = sw.media as { url?: string } | null | undefined;
  return {
    id: sw.id ?? "",
    name: sw.name ?? "",
    distinguishableName: sw.distinguishableName ?? sw.name ?? undefined,
    description: sw.description ?? null,
    media: media?.url ? { url: media.url } : undefined,
  };
}

export function toShippingMethod(sw: SwShippingMethod): ShippingMethod {
  const media = sw.media as { url?: string } | null | undefined;
  return {
    id: sw.id ?? "",
    name: sw.name ?? "",
    description: sw.description ?? null,
    media: media?.url ? { url: media.url } : undefined,
  };
}
