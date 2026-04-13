import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const body = await readBody<{ code: string }>(event);

  if (typeof body?.code !== "string" || !body.code.trim()) {
    throw createError({ statusCode: 400, statusMessage: "code required" });
  }

  const code = encodeURIComponent(body.code.trim());
  const sw = await shopwareFetch<SwCart>(event, `/checkout/cart/code/${code}`, {
    method: "POST",
  });

  return toCart(sw);
});
