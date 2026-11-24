import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountSuspended,
  mockNuxtImport,
  registerEndpoint,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import Wishlist from "~/components/Wishlist.vue";
import { dishDetail, eur, pizzaWithSizes } from "../support/dishes";
import { cart } from "../support/cart";

const { addLine, dishes } = vi.hoisted(() => ({
  addLine: vi.fn(),
  dishes: vi.fn(),
}));
// the dish sheets the BFF answers per wishlist entry
registerEndpoint("/api/menu/dishes/p1", () => dishes("p1"));
registerEndpoint("/api/menu/dishes/v21-gross", () => dishes("v21-gross"));
registerEndpoint("/api/menu/dishes/d21", () => dishes("d21"));
// the restaurant takes orders (paused: orderingPaused.test.ts)
mockNuxtImport("useShopConfig", () => () => ({ acceptsOrders: ref(true) }));
mockNuxtImport("useCustomer", () => () => ({ isLoggedIn: ref(false) }));
mockNuxtImport("useCartMutations", () => () => ({
  addLine,
  isMutating: ref(false),
}));

const pizza = dishDetail({
  id: "p1",
  number: "21",
  name: "Pizza Mix",
  price: eur(850),
  ingredients: [
    { id: "i-tomato", name: "Tomatensoße" },
    { id: "i-pilze", name: "Pilze" },
  ],
  extraGroups: [
    {
      id: "extras",
      name: "Extras",
      extras: [
        {
          id: "x1",
          number: "X1",
          name: "Extra Salami",
          price: eur(150),
          available: true,
        },
      ],
    },
  ],
});

/** The large Margherita with Extra Käse. */
const GROSS_WITH_CHEESE = {
  configuration: {
    dishId: "d21",
    variantId: "v21-gross",
    extraIds: ["x900"],
    removedIngredientIds: [],
  },
  dishNumber: "21-groß",
};

describe("wishlist page (#467)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    dishes.mockImplementation((id: string) =>
      id === "p1"
        ? pizza
        : pizzaWithSizes({
            selectedVariantId: id === "v21-gross" ? "v21-gross" : "v21-normal",
          }),
    );
    addLine.mockResolvedValue(cart());
    const wishlist = useWishlistEntries();
    wishlist.entries.value = [];
    await wishlist.add({
      configuration: {
        dishId: "p1",
        variantId: null,
        extraIds: ["x1"],
        removedIngredientIds: ["i-pilze"],
      },
      dishNumber: "21",
    });
    wishlist.loaded.value = true;
  });

  it("names the dish with its configuration and today's price", async () => {
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    const row = wrapper.get("li");
    expect(row.attributes("aria-label")).toBe(
      "Pizza Mix (+Extra Salami, ohne Pilze)",
    );
    expect(row.text()).toContain("+Extra Salami, ohne Pilze");
    expect(row.text()).toMatch(/10,00\s?€/);
  });

  it("adds the same configuration as the dish sheet", async () => {
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    const add = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("In den Warenkorb"))!;
    await add.trigger("click");
    await flushPromises();

    expect(addLine).toHaveBeenCalledTimes(1);
    expect(addLine).toHaveBeenCalledWith({
      dishId: "p1",
      variantId: null,
      extraIds: ["x1"],
      removedIngredientIds: ["i-pilze"],
      quantity: 1,
    });
  });

  it("shows a saved variant by its number and price, a saved parent as a choice", async () => {
    const wishlist = useWishlistEntries();
    wishlist.entries.value = [];
    await wishlist.add(GROSS_WITH_CHEESE);
    // a dish with variants saved without one (before #467)
    await wishlist.add({
      configuration: {
        dishId: "d21",
        variantId: null,
        extraIds: [],
        removedIngredientIds: [],
      },
      dishNumber: "21",
    });
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    const rows = wrapper.findAll("li");
    const variantRow = rows.find((row) => row.text().includes("21-groß"));
    const parentRow = rows.find((row) => !row.text().includes("21-groß"));
    expect(variantRow!.text()).toContain("Nr. 21-groß");
    // the variant plus Extra Käse
    expect(variantRow!.text()).toMatch(/11,00\s?€/);
    expect(variantRow!.text()).toContain("In den Warenkorb");
    expect(parentRow!.text()).toContain("Auswählen");
    expect(parentRow!.text()).not.toContain("In den Warenkorb");
  });

  it("adds a saved variant as the variant of its dish", async () => {
    const wishlist = useWishlistEntries();
    wishlist.entries.value = [];
    await wishlist.add(GROSS_WITH_CHEESE);
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("In den Warenkorb"))!
      .trigger("click");
    await flushPromises();

    expect(addLine).toHaveBeenCalledWith(
      expect.objectContaining({
        dishId: pizzaWithSizes().id,
        variantId: "v21-gross",
      }),
    );
  });

  it("opens the dish sheet with the saved configuration", async () => {
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    const customize = wrapper
      .findAll("a")
      .find((link) => link.text().startsWith("Anpassen"))!;
    const href = new URL(customize.attributes("href")!, "http://shop");
    expect(href.searchParams.get("produkt")).toBe("21");
    expect(href.searchParams.get("ohne")).toBe("Pilze");
    expect(href.searchParams.get("extras")).toBe("X1");
  });
});
