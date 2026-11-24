import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, ref } from "vue";
import { clearNuxtData } from "#imports";
import MenuBonCard from "~/components/Menu/BonCard.vue";
import ProductDetail from "~/components/Product/Detail.vue";
import CartUpsell from "~/components/Cart/Upsell.vue";
import Wishlist from "~/components/Wishlist.vue";
import { dish, dishDetail, eur } from "../support/dishes";
import { cart } from "../support/cart";

// While the restaurant takes no orders (checkout switch off, ordering
// paused) no control puts a dish into the cart; the header cart and the
// checkout are hidden already. The backend takes cart writes while paused
// (it refuses the order), so the storefront must not offer them.
const PAUSED = "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen";

const mocks = vi.hoisted(() => ({
  addToCart: vi.fn(),
  addUpsellDish: vi.fn(),
  addLine: vi.fn(),
}));

mockNuxtImport("useShopConfig", () => () => ({
  acceptsOrders: ref(false),
}));
mockNuxtImport("useAddToCart", () => () => ({
  setSelectedDish: vi.fn(),
  setSelectedExtras: vi.fn(),
  setRemovedIngredients: vi.fn(),
  selectedQuantity: ref(1),
  addToCart: mocks.addToCart,
  isLoading: ref(false),
}));
mockNuxtImport("useProductCartQuantity", () => () => ({
  quantity: computed(() => 0),
}));
mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${(value.amountMinor / 100).toFixed(2)} €`,
}));
const bolognese = dishDetail({
  id: "d51",
  number: "51",
  name: "Spaghetti Bolognese",
  price: eur(900),
});
mockNuxtImport("useProductDetail", () => () => ({
  detail: ref(bolognese),
  pending: ref(false),
  selectedDish: ref(bolognese),
  selectedQuantity: ref(1),
  isLoading: ref(false),
  addToCart: mocks.addToCart,
  setSelectedDish: vi.fn(),
  onExtrasSelected: vi.fn(),
  onIngredientsDeselected: vi.fn(),
}));
mockNuxtImport("useCartUpsell", () => () => ({
  loadUpsellDishes: async () => [
    dish({ id: "tiramisu", name: "Tiramisu", price: eur(550) }),
  ],
  addUpsellDish: mocks.addUpsellDish,
  isAdding: () => false,
}));
mockNuxtImport("useCartData", () => () => ({ lines: computed(() => []) }));
mockNuxtImport("useCustomer", () => () => ({ isLoggedIn: ref(false) }));
mockNuxtImport("useCartMutations", () => () => ({
  addLine: mocks.addLine,
  isMutating: ref(false),
}));
registerEndpoint("/api/menu/dishes/d51", () => bolognese);

describe("while the restaurant takes no orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNuxtData("cart-upsell");
    mocks.addLine.mockResolvedValue(cart());
  });

  it("a menu card offers no add button and says why", async () => {
    const wrapper = await mountSuspended(MenuBonCard, {
      props: {
        dish: dish({ id: "d51", name: "Spaghetti Bolognese" }),
        href: "/x",
      },
    });
    expect(wrapper.find('[data-testid="menu-add"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Gerade keine Bestellungen");
  });

  it("a menu card still opens the dish sheet of a dish with choices", async () => {
    const wrapper = await mountSuspended(MenuBonCard, {
      props: {
        dish: dish({ id: "d21", name: "Pizza Margherita", needsChoice: true }),
        href: "/x",
      },
    });
    const button = wrapper.find('[data-testid="menu-add"]');
    expect(button.attributes("aria-label")).toBe("Pizza Margherita auswählen");
    await button.trigger("click");
    expect(wrapper.emitted("select")).toHaveLength(1);
    expect(mocks.addToCart).not.toHaveBeenCalled();
  });

  it("the dish sheet has no add button and says why", async () => {
    const wrapper = await mountSuspended(ProductDetail, {
      props: { dishId: "d51" },
    });
    expect(
      wrapper
        .findAll("button")
        .some((b) => b.text().startsWith("In den Warenkorb")),
    ).toBe(false);
    expect(wrapper.text()).toContain(PAUSED);
  });

  it("the checkout suggests no dishes to add", async () => {
    const wrapper = await mountSuspended(CartUpsell);
    await flushPromises();
    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("the wishlist offers no add buttons and says why", async () => {
    localStorage.clear();
    const wishlist = useWishlistEntries();
    wishlist.entries.value = [];
    await wishlist.add({
      configuration: {
        dishId: "d51",
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
      },
      dishNumber: "51",
    });
    wishlist.loaded.value = true;
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();
    expect(wrapper.text()).toContain("Spaghetti Bolognese");
    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels.filter((text) => /in den Warenkorb/i.test(text))).toEqual([]);
    expect(wrapper.text()).toContain(PAUSED);
  });
});
