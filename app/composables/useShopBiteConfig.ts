export function useShopBiteConfig() {
  const { apiClient } = useShopwareContext();

  const { data, refresh } = useAsyncData("shopbite-config", async () => {
    const { data } = await apiClient.invoke(
      "shopbite.config.get get /shopbite/config",
    );
    return data;
  });

  return {
    deliveryTime: computed(() => data.value?.deliveryTime ?? 30),
    isCheckoutEnabled: computed(() => data.value?.isCheckoutEnabled ?? false),
    refresh,
  };
}
