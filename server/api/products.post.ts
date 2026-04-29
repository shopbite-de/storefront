import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";

type SwProductResult = { elements?: components["schemas"]["Product"][] };

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);

  const result = await shopwareFetch<SwProductResult>(event, "/product", {
    method: "POST",
    body,
  });

  return result.elements ?? [];
});
