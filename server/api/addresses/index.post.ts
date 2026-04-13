import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCustomerAddressList } from "~~/server/adapters/shopware/user";

type SwCustomerAddress = components["schemas"]["CustomerAddress"];

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);

  if (!body?.street || !body?.city) {
    throw createError({
      statusCode: 400,
      statusMessage: "street and city required",
    });
  }

  const sw = await shopwareFetch<SwCustomerAddress>(event, "/account/address", {
    method: "POST",
    body,
  });

  return toCustomerAddressList([sw])[0];
});
