import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, ref } from "vue";
import MenuBonCard from "~/components/Menu/BonCard.vue";
import type { Schemas } from "#shopware";

const mocks = vi.hoisted(() => ({
  setSelectedProduct: vi.fn(),
  addToCart: vi.fn(),
  quantity: { value: 0 },
}));

mockNuxtImport("useAddToCart", () => () => ({
  setSelectedProduct: mocks.setSelectedProduct,
  addToCart: mocks.addToCart,
  isLoading: ref(false),
}));
mockNuxtImport("useProductCartQuantity", () => () => ({
  quantity: computed(() => mocks.quantity.value),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (value: number) => `${value.toFixed(2)} €`,
}));

const group = (name: string, options: string[]) => ({
  translated: { name },
  options: options.map((option, i) => ({
    id: `${name}-${i}`,
    name: option,
    translated: { name: option },
  })),
});

const product = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "p29",
    productNumber: "29",
    name: "Pizza 4 Stagioni",
    translated: { name: "Pizza 4 Stagioni" },
    calculatedPrice: { totalPrice: 8.5 },
    childCount: 0,
    sortedProperties: [
      group("Hauptzutaten", ["Artischocken", "Salami"]),
      group("Vegetarisch", ["Ja"]),
    ],
    ...overrides,
  }) as unknown as Schemas["Product"];

function mountCard(props: Record<string, unknown> = {}) {
  return mountSuspended(MenuBonCard, {
    props: {
      product: product(),
      href: "/speisekarte/pizza/?produkt=29",
      ...props,
    },
  });
}

describe("MenuBonCard (#441)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.quantity.value = 0;
  });

  it("shows number, name, diet, ingredients and price", async () => {
    const wrapper = await mountCard();
    expect(wrapper.find("h3").text()).toBe("Nr. 29 Pizza 4 Stagioni");
    expect(wrapper.text()).toContain("Vegetarisch");
    expect(wrapper.text()).toContain("Artischocken, Salami");
    expect(wrapper.text()).toContain("8.50 €");
  });

  it("adds a product without variants straight to the cart", async () => {
    const wrapper = await mountCard();
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.attributes("aria-label")).toBe("Pizza 4 Stagioni hinzufügen");
    await button.trigger("click");
    await flushPromises();
    expect(mocks.setSelectedProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p29" }),
    );
    expect(mocks.addToCart).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("shows the quantity once the product is in the cart", async () => {
    mocks.quantity.value = 2;
    const wrapper = await mountCard();
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.text()).toBe("2");
    expect(button.attributes("aria-label")).toBe(
      "Pizza 4 Stagioni, 2 im Warenkorb, noch eine hinzufügen",
    );
  });

  it("opens the quick view for a product with variants", async () => {
    const wrapper = await mountCard({
      product: product({ childCount: 2 }),
    });
    expect(wrapper.text()).toContain("ab 8.50 €");
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.attributes("aria-label")).toBe("Pizza 4 Stagioni auswählen");
    await button.trigger("click");
    expect(mocks.addToCart).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")).toHaveLength(1);
  });

  it("opens the quick view on a plain click on the name", async () => {
    const wrapper = await mountCard();
    await wrapper.find("h3 a").trigger("click");
    expect(wrapper.emitted("select")).toHaveLength(1);
  });

  it("offers no button for a sold-out product", async () => {
    const wrapper = await mountCard({
      product: product({ available: false }),
    });
    expect(wrapper.find('[data-testid="menu-add"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Ausverkauft");
  });
});
