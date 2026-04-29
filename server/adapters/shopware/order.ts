import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import type {
  Order,
  OrderLineItem,
  OrderTransaction,
  OrderDelivery,
  CalculatedTax,
} from "~~/app/types/commerce/order";

type SwOrder = components["schemas"]["Order"];
type SwLineItem = components["schemas"]["OrderLineItem"];
type SwTransaction = components["schemas"]["OrderTransaction"];

function toOrderLineItem(sw: SwLineItem): OrderLineItem {
  const raw = sw as unknown as Record<string, unknown>;
  const priceDefinition = raw.priceDefinition as
    | { unitPrice?: number }
    | null
    | undefined;

  return {
    id: sw.id ?? "",
    type: sw.type ?? "product",
    label: sw.label ?? "",
    quantity: sw.quantity ?? 1,
    totalPrice: sw.totalPrice ?? 0,
    parentId: (sw.parentId as string | null | undefined) ?? null,
    price: {
      totalPrice: sw.totalPrice ?? 0,
      unitPrice: priceDefinition?.unitPrice ?? 0,
      quantity: sw.quantity ?? 1,
    },
    children: Array.isArray(sw.children)
      ? (sw.children as SwLineItem[]).map(toOrderLineItem)
      : undefined,
    payload:
      (sw.payload as unknown as Record<string, unknown> | null) ?? undefined,
  };
}

function toOrderTransaction(sw: SwTransaction): OrderTransaction {
  const state = sw.stateMachineState as
    | { name?: string; technicalName?: string; translated?: { name?: string } }
    | null
    | undefined;

  return {
    id: sw.id ?? "",
    paymentMethodId: sw.paymentMethodId ?? "",
    stateMachineState: state
      ? {
          name: state.name ?? "",
          technicalName: state.technicalName ?? "",
          translated: state.translated,
        }
      : undefined,
  };
}

function toDeliveries(sw: SwOrder): OrderDelivery[] {
  const deliveries = sw.deliveries as
    | Array<{ shippingMethod?: { name?: string } }>
    | null
    | undefined;
  return (
    deliveries?.map((d) => ({
      shippingMethod: d.shippingMethod
        ? { name: d.shippingMethod.name }
        : undefined,
    })) ?? []
  );
}

function toShippingTotal(sw: SwOrder): number {
  const deliveries = sw.deliveries as
    | Array<{ shippingCosts?: { totalPrice?: number } }>
    | null
    | undefined;
  return deliveries?.[0]?.shippingCosts?.totalPrice ?? 0;
}

function toCalculatedTaxes(sw: SwOrder): CalculatedTax[] {
  const taxes = sw.price?.calculatedTaxes as
    | Array<{ taxRate?: number; tax?: number }>
    | null
    | undefined;
  return (
    taxes?.map((t) => ({ taxRate: t.taxRate ?? 0, tax: t.tax ?? 0 })) ?? []
  );
}

function toOrderStatus(sw: SwOrder): string {
  const state = sw.stateMachineState as
    | { name?: string; technicalName?: string }
    | null
    | undefined;
  return state?.name ?? state?.technicalName ?? "";
}

export function toOrder(sw: SwOrder): Order {
  return {
    id: sw.id ?? "",
    orderNumber: sw.orderNumber ?? "",
    createdAt: sw.createdAt ?? "",
    amountTotal: sw.amountTotal ?? 0,
    amountNet: sw.amountNet ?? undefined,
    shippingTotal: toShippingTotal(sw),
    price: {
      totalPrice: sw.price?.totalPrice ?? 0,
      netPrice: sw.price?.netPrice ?? 0,
      positionPrice: sw.price?.positionPrice ?? 0,
      calculatedTaxes: toCalculatedTaxes(sw),
    },
    lineItems: Array.isArray(sw.lineItems)
      ? (sw.lineItems as SwLineItem[]).map(toOrderLineItem)
      : [],
    deliveries: toDeliveries(sw),
    status: toOrderStatus(sw),
    transactions: Array.isArray(sw.transactions)
      ? (sw.transactions as SwTransaction[]).map(toOrderTransaction)
      : undefined,
    customerComment: sw.customerComment ?? undefined,
  };
}
