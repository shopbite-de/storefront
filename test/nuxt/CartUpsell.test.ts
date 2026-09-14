import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, reactive } from "vue";
import { clearNuxtData } from "#imports";
import CartUpsell from "~/components/Cart/Upsell.vue";
import type { Schemas } from "#shopware";

const { mockLoadUpsellProducts, mockAddUpsellProduct } = vi.hoisted(() => ({
  mockLoadUpsellProducts: vi.fn(),
  mockAddUpsellProduct: vi.fn(),
}));

// Read lazily inside the factories, i.e. after module initialisation.
const cart = reactive({ items: [] as unknown[] });

mockNuxtImport("useCartUpsell", () => () => ({
  loadUpsellProducts: mockLoadUpsellProducts,
  addUpsellProduct: mockAddUpsellProduct,
  isAdding: () => false,
}));
mockNuxtImport("useCart", () => () => ({
  cartItems: computed(() => cart.items as Schemas["LineItem"][]),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (value: number) => `${value} €`,
}));

const product = (id: string, name: string, overrides = {}) =>
  ({
    id,
    productNumber: id.toUpperCase(),
    name,
    translated: { name },
    calculatedPrice: { totalPrice: 5.5 },
    ...overrides,
  }) as unknown as Schemas["Product"];

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
    cart.items = [];
    mockLoadUpsellProducts.mockResolvedValue([tiramisu, cola]);
  });

  it("shows the suggestions with name, number and price", async () => {
    const wrapper = await mountUpsell();

    expect(wrapper.find("h3").text()).toBe("Dazu passt");
    const tiles = wrapper.findAll("li");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]!.text()).toContain("#TIRAMISU");
    expect(tiles[0]!.text()).toContain("Tiramisu");
    expect(tiles[0]!.text()).toContain("5.5 €");
  });

  it("hides products that are already in the cart", async () => {
    cart.items = [{ id: "li-1", type: "product", referencedId: "tiramisu" }];
    const wrapper = await mountUpsell();

    expect(wrapper.text()).not.toContain("Tiramisu");
    expect(wrapper.text()).toContain("Cola");

    // Also as the product of a container item with extras.
    cart.items = [
      {
        id: "li-2",
        type: "container",
        children: [{ id: "c-1", type: "product", referencedId: "cola" }],
      },
    ];
    await flushPromises();
    expect(wrapper.text()).toContain("Tiramisu");
    expect(wrapper.text()).not.toContain("Cola");
  });

  it("renders no row when every suggestion is in the cart", async () => {
    cart.items = [
      { id: "li-1", type: "product", referencedId: "tiramisu" },
      { id: "li-2", type: "product", referencedId: "cola" },
    ];
    const wrapper = await mountUpsell();

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("adds the product on a plus click", async () => {
    const wrapper = await mountUpsell();

    await wrapper
      .find('button[aria-label="Tiramisu in den Warenkorb"]')
      .trigger("click");

    expect(mockAddUpsellProduct).toHaveBeenCalledWith(tiramisu);
  });

  it("disables the button of an unavailable product", async () => {
    mockLoadUpsellProducts.mockResolvedValue([
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
