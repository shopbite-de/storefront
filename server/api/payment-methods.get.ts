import type { components } from "~~/api-types/storeApiTypes";
import { createResilientLoader } from "../utils/backoff";

const load = createResilientLoader<string[]>();

/**
 * Names of the payment methods for the Restaurant schema of the home page
 * (useRestaurantSchema). Asked without a visitor's context, so it lists what
 * a new guest can pay with.
 */
export default defineCachedEventHandler(
  (): Promise<string[]> =>
    load("payment-methods", async () => {
      const result = await storeApiPost<{
        elements?: components["schemas"]["PaymentMethod"][];
      }>("/payment-method", {
        onlyAvailable: true,
        includes: { payment_method: ["name", "translated"] },
      });
      return (result.elements ?? []).map(
        (method) => method.translated?.name ?? method.name,
      );
    }),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.paymentMethods,
    name: "payment-methods",
    getKey: () => "payment-methods",
  },
);
