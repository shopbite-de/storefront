import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  // Shopware DELETE endpoint takes ids in the body
  const sw = await shopwareFetch<SwCart>(event, "/checkout/cart/line-item", {
    method: "DELETE",
    body: { ids: [id] },
  });

  return toCart(sw);
});
