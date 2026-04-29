import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toOrder } from "~~/server/adapters/shopware/order";

type SwOrderRouteResponse = components["schemas"]["OrderRouteResponse"];

export default defineEventHandler(async (event) => {
  const sw = await shopwareFetch<SwOrderRouteResponse>(event, "/order", {
    method: "POST",
    body: {
      sort: [{ field: "createdAt", order: "DESC" }],
      limit: 50,
      associations: {
        stateMachineState: {},
      },
    },
  });

  return (sw.orders?.elements ?? []).map(toOrder);
});
