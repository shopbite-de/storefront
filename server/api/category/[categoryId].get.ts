import { encodeForQuery } from "@shopware/api-client/helpers";
import type { components } from "~~/server/adapters/shopware/api-types/storeApiTypes";
type Schemas = components["schemas"];

const criteria = encodeForQuery({
  includes: {
    category: ["name", "translated", "seoUrl", "externalLink", "customFields"],
  },
});

export default defineCachedEventHandler(
  async (event): Promise<Schemas["Category"]> => {
    const categoryId = getRouterParam(event, "categoryId")!;
    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

    return await $fetch(`${endpoint}/category/${categoryId}`, {
      headers: { "sw-access-key": accessToken },
      query: { _criteria: criteria },
    });
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.category,
    name: "category",
    getKey: (event) => `category-${getRouterParam(event, "categoryId")}`,
  },
);
