/**
 * Shared state of the cart drawer (Header/Right.vue), so the header button
 * and the sticky cart bar open the same drawer. The drawer (vaul) is created
 * on first use instead of on every page (#314).
 */
export function useCartQuickView() {
  const open = useState("cart-quick-view-open", () => false);
  const mounted = useState("cart-quick-view-mounted", () => false);

  async function show() {
    if (!mounted.value) {
      mounted.value = true;
      await nextTick();
    }
    open.value = true;
  }

  return { open, mounted, show };
}
