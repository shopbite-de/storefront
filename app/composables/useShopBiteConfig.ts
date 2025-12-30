import { useContext, useShopwareContext } from "#imports";
import type { Schemas } from "#shopware";

type useShopBiteConfigReturn = {
  deliveryTime: ComputedRef<number>;
  isCheckoutEnabled: ComputedRef<boolean>;
  refresh(): Promise<Schemas["ShopBiteConfig"]>;
};

export function useShopBiteConfig(): useShopBiteConfigReturn {
  const { apiClient } = useShopwareContext();

  const _deliveryTime = useContext<number>("deliveryTime");
  const _isCheckoutEnabled = useContext<boolean>("isCheckoutActive");

  async function refresh(): Promise<Schemas["ShopBiteConfig"]> {
    const { data } = await apiClient.invoke(
      "shopbite.config.get get /shopbite/config",
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
