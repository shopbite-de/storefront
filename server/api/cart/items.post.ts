import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";
import type { AddCartItemPayload } from "~~/app/types/commerce/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const body = await readBody<{ items: AddCartItemPayload[] }>(event);

  if (!Array.isArray(body?.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "items required" });
  }

  const sw = await shopwareFetch<SwCart>(event, "/checkout/cart/line-item", {
    method: "POST",
    body: { items: body.items },
  });

  return toCart(sw);
});
