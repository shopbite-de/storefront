export function useShopBiteConfig() {
  const { data, refresh } = useAsyncData("shopbite-config", () =>
    $fetch<{ deliveryTime?: number; isCheckoutEnabled?: boolean }>(
      "/api/shopbite/config",
    ),
  );

  return {
    deliveryTime: computed(() => data.value?.deliveryTime ?? 30),
    isCheckoutEnabled: computed(() => data.value?.isCheckoutEnabled ?? false),
    refresh,
  };
}
