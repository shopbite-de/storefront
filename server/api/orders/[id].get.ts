import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toOrder } from "~~/server/adapters/shopware/order";

type SwOrderRouteResponse = components["schemas"]["OrderRouteResponse"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  const sw = await shopwareFetch<SwOrderRouteResponse>(event, "/order", {
    method: "POST",
    body: {
      ids: [id],
      associations: {
        lineItems: { associations: { children: {} } },
        transactions: { associations: { stateMachineState: {} } },
        stateMachineState: {},
        deliveries: {},
      },
    },
  });

  const order = sw.orders?.elements?.[0];
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" });
  }

  return toOrder(order);
});
