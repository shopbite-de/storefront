import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref, reactive, computed } from "vue";
import CartBar from "~/components/Cart/Bar.vue";

const state = reactive({ count: 0, subtotal: 0, path: "/c/Pizza/" });
const showCalls = vi.hoisted(() => ({ value: 0 }));
type Addition = {
  product: { name: string; translated: { name: string } };
  quantity: number;
};
const listeners: Array<(addition: Addition) => void> = [];

mockNuxtImport("useCart", () => () => ({
  count: computed(() => state.count),
  subtotal: computed(() => state.subtotal),
}));
mockNuxtImport("useShopBiteConfig", () => () => ({
  isCheckoutEnabled: ref(true),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (price: number) => `${price.toFixed(2)} €`,
}));
mockNuxtImport("useRoute", () => () => ({
  get path() {
    return state.path;
  },
  query: {},
}));
mockNuxtImport("useProductEvents", () => () => ({
  onCartItemAdded: (callback: (addition: Addition) => void) => {
    listeners.push(callback);
  },
}));
mockNuxtImport("useCartQuickView", () => () => ({
  open: ref(false),
  mounted: ref(false),
  show: () => {
    showCalls.value++;
  },
}));

describe("CartBar", () => {
  beforeEach(() => {
    state.count = 0;
    state.subtotal = 0;
    state.path = "/c/Pizza/";
    showCalls.value = 0;
    listeners.length = 0;
  });

  it("stays hidden with an empty cart", async () => {
    const wrapper = await mountSuspended(CartBar);
    expect(wrapper.find('[data-testid="cart-bar"]').exists()).toBe(false);
  });

  it("shows the item count and the subtotal", async () => {
    state.count = 2;
    state.subtotal = 15.5;
    const wrapper = await mountSuspended(CartBar);
    const bar = wrapper.find('[data-testid="cart-bar"]');
    expect(bar.text()).toContain("2 Artikel · 15.50 €");
  });

  it("uses the singular for one item", async () => {
    state.count = 1;
    state.subtotal = 7;
    const wrapper = await mountSuspended(CartBar);
    expect(wrapper.find('[data-testid="cart-bar"]').text()).toContain(
      "1 Artikel",
    );
  });

  it("opens the cart drawer on click", async () => {
    state.count = 2;
    const wrapper = await mountSuspended(CartBar);
    await wrapper.find('[data-testid="cart-bar"]').trigger("click");
    expect(showCalls.value).toBe(1);
  });

  it("names the added product for a moment instead of a toast", async () => {
    vi.useFakeTimers();
    state.count = 2;
    state.subtotal = 15.5;
    const wrapper = await mountSuspended(CartBar);
    for (const listener of listeners) {
      listener({
        product: { name: "Pizza Salami", translated: { name: "Pizza Salami" } },
        quantity: 2,
      });
    }
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="cart-bar"]').text()).toContain(
      "2× Pizza Salami",
    );
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="cart-bar"]').text()).toContain(
      "2 Artikel",
    );
    vi.useRealTimers();
  });

  it("is hidden on the checkout pages", async () => {
    state.count = 2;
    state.path = "/bestellung/warenkorb";
    const wrapper = await mountSuspended(CartBar);
    expect(wrapper.find('[data-testid="cart-bar"]').exists()).toBe(false);
  });
});
