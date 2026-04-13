import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import type {
  Cart,
  CartLineItem,
  CartPromotion,
  LineItemOption,
} from "~~/app/types/commerce/cart";

type SwCart = components["schemas"]["Cart"];
type SwLineItem = components["schemas"]["LineItem"];

function toLineItemOption(raw: unknown): LineItemOption {
  const o = raw as Record<string, string>;
  return { group: o.group ?? "", option: o.option ?? "" };
}

function toLineItem(item: SwLineItem): CartLineItem {
  const payload = item.payload as Record<string, unknown> | null | undefined;
  const options = Array.isArray(payload?.options)
    ? (payload!.options as unknown[]).map(toLineItemOption)
    : undefined;

  return {
    id: item.id ?? "",
    type: item.type ?? "product",
    label: item.label ?? "",
    quantity: item.quantity ?? 1,
    price: item.price
      ? {
          totalPrice: item.price.totalPrice ?? 0,
          unitPrice: item.price.unitPrice ?? 0,
          quantity: item.price.quantity ?? item.quantity ?? 1,
        }
      : null,
    children: Array.isArray(item.children)
      ? (item.children as SwLineItem[]).map(toLineItem)
      : undefined,
    payload: payload
      ? {
          productNumber:
            typeof payload.productNumber === "string"
              ? payload.productNumber
              : undefined,
          code: typeof payload.code === "string" ? payload.code : undefined,
          options,
        }
      : undefined,
  };
}

function toPromotionCodes(lineItems: SwLineItem[]): CartPromotion[] {
  return lineItems
    .filter((i) => i.type === "promotion")
    .map((i) => {
      const payload = i.payload as Record<string, unknown> | null | undefined;
      return {
        id: i.id ?? "",
        code: typeof payload?.code === "string" ? payload.code : "",
        label: i.label ?? "",
      };
    });
}

function toShippingTotal(sw: SwCart): number {
  const deliveries = sw.deliveries as
    | Array<{ shippingCosts?: { totalPrice?: number } }>
    | null
    | undefined;
  return deliveries?.[0]?.shippingCosts?.totalPrice ?? 0;
}

export function toCart(sw: SwCart): Cart {
  const lineItems = Array.isArray(sw.lineItems)
    ? (sw.lineItems as SwLineItem[])
    : [];

  const errors = (sw.errors ?? {}) as Record<string, Record<string, unknown>>;

  return {
    lineItems: lineItems.map(toLineItem),
    price: {
      totalPrice: sw.price?.totalPrice ?? 0,
      positionPrice: sw.price?.positionPrice ?? 0,
      netPrice: sw.price?.netPrice ?? 0,
      taxStatus: sw.price?.taxStatus ?? "gross",
    },
    errors: errors as Cart["errors"],
    promotionCodes: toPromotionCodes(lineItems),
    shippingTotal: toShippingTotal(sw),
  };
}
