/**
 * Resolves the menu root once per visit (app/utils/menuRoot.ts). Call the
 * returned function inside `useAsyncData` handlers; without the environment
 * variable it asks the storefront's server (`/api/menu/root`) a single time.
 */
export function useMenuRootId() {
  const configured = useRuntimeConfig().public.shopBite.menuCategoryId as
    string | undefined;
  const root = useState<string | null>("menu-root-id", () =>
    configured ? configured : null,
  );

  return async (): Promise<string> => {
    if (root.value) return root.value;
    try {
      const { id } = await $fetch<{ id: string }>("/api/menu/root");
      root.value = pickMenuRoot(configured, id);
      return root.value;
    } catch {
      // not remembered: the next call tries again
      return pickMenuRoot(configured, undefined);
    }
  };
}
