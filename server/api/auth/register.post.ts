import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
import { toCustomer } from "~~/server/adapters/shopware/user";

type SwCustomer = components["schemas"]["Customer"];

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: "email required" });
  }

  const { storeUrl } = useRuntimeConfig().public;

  const sw = await shopwareFetch<SwCustomer>(event, "/account/register", {
    method: "POST",
    body: { ...body, storefrontUrl: storeUrl },
  });

  return toCustomer(sw);
});
