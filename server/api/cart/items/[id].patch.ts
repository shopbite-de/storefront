import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody<{ quantity: number }>(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  if (typeof body?.quantity !== "number" || body.quantity < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "quantity must be a positive number",
    });
  }

  // Shopware PATCH endpoint accepts an array of items to update
  const sw = await shopwareFetch<SwCart>(event, "/checkout/cart/line-item", {
    method: "PATCH",
    body: { items: [{ id, quantity: body.quantity }] },
  });

  return toCart(sw);
});
