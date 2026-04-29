import { encodeForQuery } from "@shopware/api-client/helpers";
import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";

type SwSeoUrlResult = { elements?: components["schemas"]["SeoUrl"][] };

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event) as { path?: string };

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: "path required" });
  }

  const isTechnicalUrl =
    path.startsWith("/navigation/") ||
    path.startsWith("/detail/") ||
    path.startsWith("/landingPage/");

  const normalizedPath = isTechnicalUrl
    ? path.endsWith("/")
      ? path.slice(0, -1)
      : path
    : path.substring(1);

  const criteria = encodeForQuery({
    filter: [
      {
        type: "equals",
        field: isTechnicalUrl ? "pathInfo" : "seoPathInfo",
        value: normalizedPath,
      },
    ],
  });

  const result = await shopwareFetch<SwSeoUrlResult>(event, "/seo-url", {
    query: { _criteria: criteria },
  });

  return result.elements?.[0] ?? null;
});
