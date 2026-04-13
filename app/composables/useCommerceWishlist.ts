const WISHLIST_STATE_KEY = "commerce:wishlist";
const STORAGE_KEY = "shopbite-wishlist";

/**
 * Platform-agnostic wishlist composable backed by localStorage.
 * Replaces useWishlist() from @shopware/composables.
 */
export function useCommerceWishlist() {
  const items = useState<string[]>(WISHLIST_STATE_KEY, () => []);

  const count = computed(() => items.value.length);

  function loadFromStorage(): void {
    if (!import.meta.client) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      items.value = stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      items.value = [];
    }
  }

  function saveToStorage(): void {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
  }

  function getWishlistProducts(): void {
    loadFromStorage();
  }

  function addToWishlist(productId: string): void {
    if (items.value.includes(productId)) return;
    items.value = [...items.value, productId];
    saveToStorage();
  }

  function removeFromWishlist(productId: string): void {
    items.value = items.value.filter((id) => id !== productId);
    saveToStorage();
  }

  function isInWishlistCheck(productId: string): boolean {
    return items.value.includes(productId);
  }

  function clearWishlist(): void {
    items.value = [];
    saveToStorage();
  }

  // After login: best-effort sync; no-op if the platform doesn't support it
  function mergeWishlistProducts(): void {
    // localStorage items are already in memory — nothing to merge for now
  }

  return {
    items,
    count,
    getWishlistProducts,
    addToWishlist,
    removeFromWishlist,
    isInWishlistCheck,
    clearWishlist,
    mergeWishlistProducts,
  };
}
