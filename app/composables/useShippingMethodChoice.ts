import type { Schemas } from "#shopware";

/**
 * All active shipping methods of the sales channel, for the order mode
 * above the menu and the shipping section of the checkout.
 *
 * `useCheckout().getShippingMethods()` asks the Store API for the methods
 * whose availability rule matches right now. A rule on the shipping
 * address (La Fattoria: "Valide Lieferung", city Obertshausen, Hausen or
 * Lämmerspiel) never matches before the guest has entered an address, so
 * "Lieferung" vanished from the choice. Whether the chosen method works
 * for the address is checked in the cart (`shipping-method-blocked`).
 */
export function useShippingMethodChoice() {
  const { apiClient } = useShopwareContext();
  const methods = useState<Schemas["ShippingMethod"][]>(
    "shopbite-shipping-method-choice",
    () => [],
  );

  async function load({ forceReload } = { forceReload: false }) {
    if (methods.value.length && !forceReload) return methods;
    const response = await apiClient.invoke(
      "readShippingMethod post /shipping-method",
      {
        body: { associations: { prices: {} } },
        query: { onlyAvailable: false },
      },
    );
    methods.value = [...(response.data.elements ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    return methods;
  }

  return { methods, load };
}
