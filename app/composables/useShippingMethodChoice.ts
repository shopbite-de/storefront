import type { ShippingMethod } from "../../shared/domain";

/**
 * All active shipping methods of the shop, for the order mode above the
 * menu and the shipping section of the checkout: the shop's shipping
 * methods (`/api/checkout/shipping-methods`, `ShippingMethod[]`).
 *
 * Every active method is offered, also one whose delivery-area rule needs
 * an address the guest has not entered yet ("Lieferung" would vanish
 * otherwise); whether the chosen method works for the address is a
 * `shipping_method_blocked` message of the cart.
 */
export function useShippingMethodChoice() {
  const { shippingMethods, refresh } = useShippingMethods();

  const methods = computed<readonly ShippingMethod[]>(
    () => shippingMethods.value ?? [],
  );

  async function load({ forceReload } = { forceReload: false }) {
    if (methods.value.length && !forceReload) return methods;
    await refresh();
    return methods;
  }

  return { methods, load };
}
