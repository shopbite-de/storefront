import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import Wishlist from "~/components/Wishlist.vue";

const { invoke, addLineItems } = vi.hoisted(() => ({
  invoke: vi.fn(),
  addLineItems: vi.fn(),
}));
mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke },
}));
mockNuxtImport("useUser", () => () => ({ isLoggedIn: ref(false) }));
mockNuxtImport("useCartMutations", () => () => ({
  addLineItems,
  isMutating: ref(false),
}));

const pizza = {
  id: "p1",
  productNumber: "21",
  name: "Pizza Mix",
  translated: { name: "Pizza Mix" },
  calculatedPrice: { unitPrice: 8.5 },
  childCount: 0,
};
const salami = {
  id: "x1",
  productNumber: "X1",
  name: "Extra Salami",
  translated: { name: "Extra Salami" },
  calculatedPrice: { unitPrice: 1.5 },
};

describe("wishlist page (#467)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    invoke.mockImplementation(
      async (_operation: string, options: { body: { ids?: string[] } }) => ({
        data: { elements: options.body.ids ? [pizza] : [salami] },
      }),
    );
    addLineItems.mockResolvedValue({ id: "cart" });
    const wishlist = useWishlistEntries();
    wishlist.entries.value = [];
    await wishlist.add({
      productId: "p1",
      productNumber: "21",
      without: ["Pilze"],
      extras: ["X1"],
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

  it("adds the same container line item as the product sheet", async () => {
    const wrapper = await mountSuspended(Wishlist);
    await flushPromises();

    const add = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("In den Warenkorb"))!;
    await add.trigger("click");
    await flushPromises();

    const [items] = addLineItems.mock.calls[0]!;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "container",
      quantity: 1,
      label: "Pizza Mix +Extra Salami -Pilze",
      payload: { productNumber: "21" },
    });
    expect(items[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referencedId: "p1", type: "product" }),
        expect.objectContaining({ id: "x1", type: "product" }),
      ]),
    );
  });

  it("opens the product sheet with the saved configuration", async () => {
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
