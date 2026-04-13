import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toShippingMethod } from "~~/server/adapters/shopware/checkout";
import type {
  MethodsResponse,
  ShippingMethod,
} from "~~/app/types/commerce/checkout";

type SwContext = components["schemas"]["SalesChannelContext"];
type SwShippingMethod = components["schemas"]["ShippingMethod"];

export default defineEventHandler(
  async (event): Promise<MethodsResponse<ShippingMethod>> => {
    const [methodsRaw, contextRaw] = await Promise.all([
      shopwareFetch<{ elements: SwShippingMethod[] }>(
        event,
        "/shipping-method",
        {
          method: "POST",
          body: { onlyAvailable: true },
        },
      ),
      shopwareFetch<SwContext>(event, "/context"),
    ]);

    const selectedMethod = contextRaw.shippingMethod as
      | { id?: string }
      | null
      | undefined;

    return {
      methods: (methodsRaw.elements ?? []).map(toShippingMethod),
      selectedId: selectedMethod?.id ?? null,
    };
  },
);
