import type { ShippingMethod } from "../../shared/domain";

export const SHIPPING_METHODS_KEY = "shipping-methods";

/**
 * The shop's shipping methods with fulfillment and lead time
 * (`/api/checkout/shipping-methods`, CheckoutPort, shopbite#6): from the
 * server's cache (`cacheTtl.config`) for server-side rendering, live in the
 * browser once after hydration (useLiveShopData), because the lead time
 * decides the earliest wished time.
 */
export function useShippingMethods() {
  const { data, refresh } = useAsyncData(SHIPPING_METHODS_KEY, () =>
    loadShopData<readonly ShippingMethod[]>(
      "/api/checkout/shipping-methods",
      import.meta.client,
    ),
  );

  return {
    shippingMethods: data,
    /** Fulfillment and lead time of a method (unlisted: delivery, none). */
    leadTimeFor: (methodId: string | null | undefined) =>
      shippingLeadTime(data.value, methodId),
    /** Lead time of the first delivery method, `null` without one. */
    deliveryTime: computed(() => fulfillmentLeadTime(data.value, "delivery")),
    /** Lead time of the first pickup method, `null` without one. */
    pickupTime: computed(() => fulfillmentLeadTime(data.value, "pickup")),
    refresh,
  };
}
