import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";

type SwSalutationResult = { elements?: components["schemas"]["Salutation"][] };

export default defineEventHandler(async (event) => {
  const result = await shopwareFetch<SwSalutationResult>(event, "/salutation");
  return result.elements ?? [];
});
