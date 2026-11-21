import type { Cart, CartMessageCode, Money } from "../../shared/domain";

/**
 * The visitor's cart (ADR 0001, step 4): the domain `Cart` from `/api/cart`,
 * shared app-wide. Loaded in the browser (app.vue on mount, after a login,
 * the checkout before an order); the server renders without it, so nothing
 * of it is in the page payload. Writes go through `useCartMutations`.
 */
export function useCartData() {
  const cart = useState<Cart | null>("cart", () => null);

  const lines = computed(() => cart.value?.lines ?? []);
  const discounts = computed(() => cart.value?.discounts ?? []);
  const messages = computed(() => cart.value?.messages ?? []);
  /** Dishes in the cart, every line by its quantity. */
  const count = computed(() =>
    lines.value.reduce((sum, line) => sum + line.quantity, 0),
  );
  const isEmpty = computed(() => count.value <= 0);
  const subtotal = computed<Money | null>(() => cart.value?.subtotal ?? null);
  const shippingCosts = computed<Money | null>(
    () => cart.value?.shippingCosts ?? null,
  );
  const total = computed<Money | null>(() => cart.value?.total ?? null);

  function hasMessage(code: CartMessageCode): boolean {
    return messages.value.some((message) => message.code === code);
  }

  /** Loads the cart; rejects when it cannot be loaded. */
  async function refresh(): Promise<Cart> {
    const next = await $fetch<Cart>("/api/cart");
    cart.value = next;
    return next;
  }

  function setCart(next: Cart) {
    cart.value = next;
  }

  return {
    cart: computed(() => cart.value),
    lines,
    discounts,
    messages,
    count,
    isEmpty,
    subtotal,
    shippingCosts,
    total,
    hasMessage,
    refresh,
    setCart,
  };
}
