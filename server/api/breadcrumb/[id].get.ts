import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  return await shopwareFetch<components["schemas"]["Breadcrumb"][]>(
    event,
    `/breadcrumb/${id}`,
    { query: { type: "category" } },
  );
});
