import { createResilientLoader } from "../utils/backoff";
import { answerDomain } from "../utils/domainHttp";

const load = createResilientLoader<string[]>();

/**
 * Names of the payment methods for the Restaurant schema of the home page
 * (useRestaurantSchema), from `CheckoutPort.listPaymentMethods()` without a
 * visitor: what a new guest can pay with.
 */
export default defineCachedEventHandler(
  (event): Promise<string[]> =>
    answerDomain(() =>
      load("payment-methods", async () =>
        (await useBackend(event).checkout.listPaymentMethods()).map(
          (method) => method.name,
        ),
      ),
    ),
  {
    maxAge: useRuntimeConfig().public.shopBite.cacheTtl.paymentMethods,
    name: "payment-methods",
    getKey: () => "payment-methods",
  },
);
