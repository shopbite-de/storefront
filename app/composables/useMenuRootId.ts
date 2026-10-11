/**
 * Resolves the menu root once per visit (app/utils/menuRoot.ts). Call the
 * returned function inside `useAsyncData` handlers; without the environment
 * variable it asks the plugin configuration a single time.
 */
export function useMenuRootId() {
  const { apiClient } = useShopwareContext();
  const configured = useRuntimeConfig().public.shopBite.menuCategoryId as
    string | undefined;
  const root = useState<string | null>("menu-root-id", () =>
    configured ? configured : null,
  );

  return async (): Promise<string> => {
    if (root.value) return root.value;
    try {
      const { data } = await apiClient.invoke(
        "shopbite.config.get get /shopbite/config",
      );
      root.value = pickMenuRoot(configured, data.menuCategoryId);
      return root.value;
    } catch {
      // not remembered: the next call tries again
      return pickMenuRoot(configured, undefined);
    }
  };
}
