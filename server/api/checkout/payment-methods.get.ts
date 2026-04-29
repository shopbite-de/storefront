import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toPaymentMethod } from "~~/server/adapters/shopware/checkout";
import type {
  MethodsResponse,
  PaymentMethod,
} from "~~/app/types/commerce/checkout";

type SwContext = components["schemas"]["SalesChannelContext"];
type SwPaymentMethod = components["schemas"]["PaymentMethod"];

export default defineEventHandler(
  async (event): Promise<MethodsResponse<PaymentMethod>> => {
    const [methodsRaw, contextRaw] = await Promise.all([
      shopwareFetch<{ elements: SwPaymentMethod[] }>(event, "/payment-method", {
        method: "POST",
        body: { onlyAvailable: true },
      }),
      shopwareFetch<SwContext>(event, "/context"),
    ]);

    const selectedMethod = contextRaw.paymentMethod as
      | { id?: string }
      | null
      | undefined;

    return {
      methods: (methodsRaw.elements ?? []).map(toPaymentMethod),
      selectedId: selectedMethod?.id ?? null,
    };
  },
);
