import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import CartQuickView from "~/components/Cart/QuickView.vue";
import { useCartData } from "~/composables/useCartData";
import type { Cart } from "../../shared/domain";
import { eur } from "../support/dishes";
import { cart, cartLine } from "../support/cart";

const { cartAnswer } = vi.hoisted(() => ({ cartAnswer: vi.fn() }));

registerEndpoint("/api/cart", () => cartAnswer());

mockNuxtImport("useCartMutations", () => () => ({
  setQuantity: vi.fn(),
  removeLine: vi.fn(),
  isMutating: ref(false),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number } | null) =>
    value ? `${(value.amountMinor / 100).toFixed(2)} €` : "",
}));

const filled: Cart = cart({
  lines: [
    cartLine({ id: "a", quantity: 2, totalPrice: eur(1400) }),
    cartLine({
      id: "b",
      name: "Cola",
      configuration: {
        dishId: "cola",
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
      },
      totalPrice: eur(300),
    }),
  ],
  discounts: [
    { code: "WILLKOMMEN", name: "Willkommensrabatt", amount: eur(-200) },
  ],
  subtotal: eur(1500),
  shippingCosts: eur(0),
  total: eur(1500),
});

describe("useCartData", () => {
  beforeEach(() => {
    useCartData().setCart(cart());
  });

  it("loads the cart from the BFF and counts its dishes", async () => {
    cartAnswer.mockReturnValue(filled);
    const data = useCartData();

    await data.refresh();

    expect(data.count.value).toBe(3);
    expect(data.isEmpty.value).toBe(false);
    expect(data.subtotal.value).toEqual(eur(1500));
    expect(data.hasMessage("voucher_invalid")).toBe(false);
  });

  it("rejects when the cart cannot be loaded", async () => {
    cartAnswer.mockImplementation(() => {
      throw new Error("down");
    });
    await expect(useCartData().refresh()).rejects.toBeDefined();
  });
});

describe("CartQuickView", () => {
  it("lists the lines, the discount, free delivery and the total", async () => {
    useCartData().setCart(filled);
    const wrapper = await mountSuspended(CartQuickView);

    expect(wrapper.findAll(".cart-item")).toHaveLength(2);
    expect(wrapper.text()).toContain("Willkommensrabatt");
    expect(wrapper.text()).toContain("-2.00 €");
    expect(wrapper.text()).toContain("kostenlos");
    expect(wrapper.text()).toMatch(/Gesamt\s*15\.00 €/);
  });

  it("names the delivery costs when there are any", async () => {
    useCartData().setCart({
      ...filled,
      shippingCosts: eur(250),
      total: eur(1750),
    });
    const wrapper = await mountSuspended(CartQuickView);

    expect(wrapper.text()).toContain("2.50 €");
    expect(wrapper.text()).not.toContain("kostenlos");
  });

  it("points an empty cart to the menu", async () => {
    useCartData().setCart(cart());
    const wrapper = await mountSuspended(CartQuickView);

    expect(wrapper.text()).toContain("Der Warenkorb ist noch leer.");
  });
});
