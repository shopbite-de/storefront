import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, "code");

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: "code required" });
  }

  const sw = await shopwareFetch<SwCart>(
    event,
    `/checkout/cart/code/${encodeURIComponent(code)}`,
    { method: "DELETE" },
  );

  return toCart(sw);
});
