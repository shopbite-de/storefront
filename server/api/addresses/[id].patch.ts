import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCustomerAddressList } from "~~/server/adapters/shopware/user";

type SwCustomerAddress = components["schemas"]["CustomerAddress"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody<Record<string, unknown>>(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  const sw = await shopwareFetch<SwCustomerAddress>(
    event,
    `/account/address/${id}`,
    { method: "PATCH", body },
  );

  return toCustomerAddressList([sw])[0];
});
