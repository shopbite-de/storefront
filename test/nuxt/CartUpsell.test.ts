import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, reactive, ref } from "vue";
import { clearNuxtData } from "#imports";
import CartUpsell from "~/components/Cart/Upsell.vue";
import type { CartLine, Dish } from "../../shared/domain";
import { dish, eur } from "../support/dishes";
import { cartLine } from "../support/cart";

const { mockLoadUpsellDishes, mockAddUpsellDish } = vi.hoisted(() => ({
  mockLoadUpsellDishes: vi.fn(),
  mockAddUpsellDish: vi.fn(),
}));

// Read lazily inside the factories, i.e. after module initialisation.
const cart = reactive({ lines: [] as CartLine[] });

mockNuxtImport("useCartUpsell", () => () => ({
  loadUpsellDishes: mockLoadUpsellDishes,
  addUpsellDish: mockAddUpsellDish,
  isAdding: () => false,
}));
// the restaurant takes orders (paused: orderingPaused.test.ts)
mockNuxtImport("useShopConfig", () => () => ({
  acceptsOrders: ref(true),
}));
mockNuxtImport("useCartData", () => () => ({
  lines: computed(() => cart.lines),
}));

const lineOf = (dishId: string, extraIds: string[] = []) =>
  cartLine({
    id: `line-${dishId}`,
    configuration: {
      dishId,
      variantId: null,
      extraIds,
      removedIngredientIds: [],
    },
  });
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${value.amountMinor / 100} €`,
}));

const product = (id: string, name: string, overrides: Partial<Dish> = {}) =>
  dish({ id, number: id.toUpperCase(), name, price: eur(550), ...overrides });

const tiramisu = product("tiramisu", "Tiramisu");
const cola = product("cola", "Cola");

async function mountUpsell() {
  const wrapper = await mountSuspended(CartUpsell);
  await flushPromises();
  return wrapper;
}

describe("CartUpsell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNuxtData("cart-upsell");
    cart.lines = [];
    mockLoadUpsellDishes.mockResolvedValue([tiramisu, cola]);
  });

  it("shows the suggestions with name and price", async () => {
    const wrapper = await mountUpsell();

    expect(wrapper.find("h3").text()).toBe("Dazu passt");
    const tiles = wrapper.findAll("li");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]!.text()).toContain("Tiramisu");
    expect(tiles[0]!.text()).toContain("5.5 €");
  });

  it("hides dishes that are already in the cart", async () => {
    cart.lines = [lineOf("tiramisu")];
    const wrapper = await mountUpsell();

    expect(wrapper.text()).not.toContain("Tiramisu");
    expect(wrapper.text()).toContain("Cola");

    // Also as an extra of a configured dish.
    cart.lines = [lineOf("pizza", ["cola"])];
    await flushPromises();
    expect(wrapper.text()).toContain("Tiramisu");
    expect(wrapper.text()).not.toContain("Cola");
  });

  it("renders no row when every suggestion is in the cart", async () => {
    cart.lines = [lineOf("tiramisu"), lineOf("cola")];
    const wrapper = await mountUpsell();

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("adds the dish on a plus click", async () => {
    const wrapper = await mountUpsell();

    await wrapper
      .find('button[aria-label="Tiramisu in den Warenkorb"]')
      .trigger("click");

    expect(mockAddUpsellDish).toHaveBeenCalledWith(tiramisu);
  });

  it("disables the button of a sold-out dish", async () => {
    mockLoadUpsellDishes.mockResolvedValue([
      product("panna-cotta", "Panna Cotta", { available: false }),
      cola,
    ]);
    const wrapper = await mountUpsell();

    expect(
      wrapper
        .find('button[aria-label="Panna Cotta in den Warenkorb"]')
        .attributes("disabled"),
    ).toBeDefined();
    expect(
      wrapper
        .find('button[aria-label="Cola in den Warenkorb"]')
        .attributes("disabled"),
    ).toBeUndefined();
  });
});
