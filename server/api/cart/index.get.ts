import type { components } from "~~/api-types/storeApiTypes";
import { toCart } from "~~/server/adapters/shopware/cart";

type SwCart = components["schemas"]["Cart"];

export default defineEventHandler(async (event) => {
  const sw = await shopwareFetch<SwCart>(event, "/checkout/cart");
  return toCart(sw);
});
