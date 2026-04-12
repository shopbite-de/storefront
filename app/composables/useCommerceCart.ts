import type { Cart, AddCartItemPayload } from "~/types/commerce/cart";

const CART_STATE_KEY = "commerce:cart";

/**
 * Platform-agnostic cart composable backed by /api/cart.
 *
 * Designed to replace useCart() from @shopware/composables once the POC is
 * validated. Uses useState so cart state is shared across all components and
 * is SSR-safe without re-fetching on the client.
 *
 * Usage mirrors the existing useCart() API as closely as possible to make
 * the eventual component migration mechanical.
 */
export function useCommerceCart() {
  const cart = useState<Cart | null>(CART_STATE_KEY, () => null);

  const isEmpty = computed(
    () =>
      !cart.value?.lineItems.filter(
        (i) => i.type !== "promotion" && i.type !== "discount",
      ).length,
  );

  const shippingTotal = computed(() => cart.value?.shippingTotal ?? 0);

  const appliedPromotionCodes = computed(
    () => cart.value?.promotionCodes ?? [],
  );

  async function refreshCart(): Promise<void> {
    cart.value = await $fetch<Cart>("/api/cart");
  }

  /**
   * Add one or more line items to the cart.
   * Accepts the same item shape used in useAddToCart.createCartItems().
   */
  async function addProducts(items: AddCartItemPayload[]): Promise<Cart> {
    const updated = await $fetch<Cart>("/api/cart/items", {
      method: "POST",
      body: { items },
    });
    cart.value = updated;
    return updated;
  }

  async function removeItem(item: { id: string }): Promise<void> {
    cart.value = await $fetch<Cart>(`/api/cart/items/${item.id}`, {
      method: "DELETE",
    });
  }

  async function changeProductQuantity(item: {
    id: string;
    quantity: number;
  }): Promise<void> {
    cart.value = await $fetch<Cart>(`/api/cart/items/${item.id}`, {
      method: "PATCH",
      body: { quantity: item.quantity },
    });
  }

  async function addPromotionCode(code: string): Promise<void> {
    cart.value = await $fetch<Cart>("/api/cart/promotions", {
      method: "POST",
      body: { code },
    });
  }

  async function removePromotionCode(code: string): Promise<void> {
    cart.value = await $fetch<Cart>(`/api/cart/promotions/${code}`, {
      method: "DELETE",
    });
  }

  return {
    cart,
    isEmpty,
    shippingTotal,
    appliedPromotionCodes,
    refreshCart,
    addProducts,
    removeItem,
    changeProductQuantity,
    addPromotionCode,
    removePromotionCode,
  };
}
