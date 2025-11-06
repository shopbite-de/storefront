import { useContext, useShopwareContext } from "#imports";
import type { Schemas } from "#shopware";

type usePizzaToppingsReturn = {
  deliveryTime: ComputedRef<number>;
  isCheckoutEnabled: ComputedRef<boolean>;
  refresh(): Promise<Schemas["PizzaToppings"]>;
};

export function usePizzaToppings(): usePizzaToppingsReturn {
  const { apiClient } = useShopwareContext();

  const _deliveryTime = useContext<number>("deliveryTime");
  const _isCheckoutEnabled = useContext<boolean>("isCheckoutActive");

  async function refresh(): Promise<Schemas["PizzaToppings"]> {
    const { data } = await apiClient.invoke(
      "pizza-toppings.get get /pizza-toppings",
    );
    _deliveryTime.value = data.deliveryTime;
    _isCheckoutEnabled.value = data.isCheckoutEnabled;

    return data;
  }

  return {
    deliveryTime: computed(() => _deliveryTime.value),
    isCheckoutEnabled: computed(() => _isCheckoutEnabled.value),
    refresh,
  };
}
