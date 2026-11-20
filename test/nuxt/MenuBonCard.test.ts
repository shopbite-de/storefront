import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, ref } from "vue";
import MenuBonCard from "~/components/Menu/BonCard.vue";
import type { Dish } from "../../shared/domain";
import { dish, eur } from "../support/dishes";

const mocks = vi.hoisted(() => ({
  setSelectedDish: vi.fn(),
  addToCart: vi.fn(),
  quantity: { value: 0 },
}));

mockNuxtImport("useAddToCart", () => () => ({
  setSelectedDish: mocks.setSelectedDish,
  addToCart: mocks.addToCart,
  isLoading: ref(false),
}));
mockNuxtImport("useProductCartQuantity", () => () => ({
  quantity: computed(() => mocks.quantity.value),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${(value.amountMinor / 100).toFixed(2)} €`,
}));

const product = (overrides: Partial<Dish> = {}) =>
  dish({
    id: "p29",
    number: "29",
    name: "Pizza 4 Stagioni",
    price: eur(850),
    ingredients: [
      { id: "a", name: "Artischocken" },
      { id: "s", name: "Salami" },
    ],
    diets: ["vegetarian"],
    ...overrides,
  });

function mountCard(props: Record<string, unknown> = {}) {
  return mountSuspended(MenuBonCard, {
    props: {
      dish: product(),
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

  it("adds a dish without variants straight to the cart", async () => {
    const wrapper = await mountCard();
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.attributes("aria-label")).toBe("Pizza 4 Stagioni hinzufügen");
    await button.trigger("click");
    await flushPromises();
    expect(mocks.setSelectedDish).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p29" }),
    );
    expect(mocks.addToCart).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("select")).toBeUndefined();
  });

  it("shows the quantity once the dish is in the cart", async () => {
    mocks.quantity.value = 2;
    const wrapper = await mountCard();
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.text()).toBe("2");
    expect(button.attributes("aria-label")).toBe(
      "Pizza 4 Stagioni, 2 im Warenkorb, noch eine hinzufügen",
    );
  });

  it("opens the dish sheet for a dish with variants", async () => {
    const wrapper = await mountCard({
      dish: product({ needsChoice: true, priceFrom: true }),
    });
    expect(wrapper.text()).toContain("ab 8.50 €");
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.attributes("aria-label")).toBe("Pizza 4 Stagioni auswählen");
    await button.trigger("click");
    expect(mocks.addToCart).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")).toHaveLength(1);
  });

  it("opens the dish sheet on a plain click on the name", async () => {
    const wrapper = await mountCard();
    await wrapper.find("h3 a").trigger("click");
    expect(wrapper.emitted("select")).toHaveLength(1);
  });

  it("shows the dish's photo with its renditions in the photo view", async () => {
    const wrapper = await mountCard({
      photo: true,
      dish: product({
        media: {
          url: "https://cdn.example.com/29.webp",
          alt: null,
          width: 800,
          height: 600,
          sources: [{ url: "https://cdn.example.com/29-400.webp", width: 400 }],
        },
      }),
    });
    const image = wrapper.find("img");
    expect(image.attributes("src")).toBe("https://cdn.example.com/29.webp");
    expect(image.attributes("srcset")).toBe(
      "https://cdn.example.com/29-400.webp 400w",
    );
    expect(image.attributes("width")).toBe("800");
  });

  it("offers no button for a sold-out dish", async () => {
    const wrapper = await mountCard({
      dish: product({ available: false }),
    });
    expect(wrapper.find('[data-testid="menu-add"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Ausverkauft");
  });
});
