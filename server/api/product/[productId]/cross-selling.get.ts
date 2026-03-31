import { encodeForQuery } from "@shopware/api-client/helpers";
import type { components } from "~~/api-types/storeApiTypes";

type Schemas = components["schemas"];

const criteria = encodeForQuery({
  includes: {
    cross_selling_element: ["crossSelling", "products"],
    cross_selling: ["name"],
    product: ["id", "name", "calculatedPrice", "translated"],
    calculated_price: ["unitPrice"],
  },
});

export default defineCachedEventHandler(
  async (event): Promise<Schemas["CrossSellingElement"][]> => {
    const productId = getRouterParam(event, "productId")!;
    const { endpoint, accessToken } = useRuntimeConfig().public.shopware;

    return await $fetch(`${endpoint}/product/${productId}/cross-selling`, {
      method: "POST",
      headers: { "sw-access-key": accessToken },
      query: { _criteria: criteria },
    });
  },
  {
    maxAge: 86400,
    name: "cross-selling",
    getKey: (event) => `cross-selling-${getRouterParam(event, "productId")}`,
  },
);
