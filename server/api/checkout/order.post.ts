import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toOrder } from "~~/server/adapters/shopware/order";

type SwOrder = components["schemas"]["Order"];

export default defineEventHandler(async (event) => {
  const body = await readBody<{ customerComment?: string }>(event);

  const sw = await shopwareFetch<SwOrder>(event, "/checkout/order", {
    method: "POST",
    body: body ?? {},
  });

  return toOrder(sw);
});
