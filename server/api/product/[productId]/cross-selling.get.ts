import type { components } from "~~/api-types/storeApiTypes";

type Schemas = components["schemas"];

const criteria = {
  includes: {
    cross_selling_element: ["crossSelling", "products"],
    cross_selling: ["name"],
    product: ["id", "name", "calculatedPrice", "translated"],
    calculated_price: ["unitPrice"],
  },
};

export default defineCachedEventHandler(
  async (event): Promise<Schemas["CrossSellingElement"][]> => {
    const productId = getRouterParam(event, "productId")!;

    return await storeApiPost(`/product/${productId}/cross-selling`, criteria);
  },
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.crossSelling,
    name: "cross-selling",
    getKey: (event) => `cross-selling-${getRouterParam(event, "productId")}`,
  },
);
