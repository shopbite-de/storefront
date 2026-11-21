import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { nextTick, ref } from "vue";
import CartItem from "~/components/Cart/Item.vue";
import { eur } from "../support/dishes";
import { cartLine } from "../support/cart";

const { mockSetQuantity, mockRemoveLine } = vi.hoisted(() => ({
  mockSetQuantity: vi.fn(),
  mockRemoveLine: vi.fn(),
}));

// Read lazily inside the factory, i.e. after module initialisation.
const isMutating = ref(false);

mockNuxtImport("useCartMutations", () => () => ({
  setQuantity: mockSetQuantity,
  removeLine: mockRemoveLine,
  addLine: vi.fn(),
  isMutating,
}));

mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedMoney: (value: { amountMinor: number }) =>
    `${value.amountMinor / 100} €`,
}));

const lineItem = cartLine({
  id: "li-1",
  name: "Pizza Margherita",
  quantity: 2,
  totalPrice: eur(1800),
});

describe("CartItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMutating.value = false;
    mockSetQuantity.mockResolvedValue(undefined);
  });

  it("forwards each quantity change with the clicked value, based on the local state", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { line: lineItem },
    });

    // Two quick changes before the cart prop updates
    // @ts-expect-error - access internal state
    wrapper.vm.quantity = 3;
    // @ts-expect-error - access internal state
    wrapper.vm.quantity = 4;
    await nextTick();

    expect(mockSetQuantity).toHaveBeenNthCalledWith(1, "li-1", 3);
    expect(mockSetQuantity).toHaveBeenNthCalledWith(2, "li-1", 4);
    // @ts-expect-error - access internal state
    expect(wrapper.vm.quantity).toBe(4);
  });

  it("keeps the optimistic value while a mutation runs and re-syncs afterwards", async () => {
    isMutating.value = true;
    const wrapper = await mountSuspended(CartItem, {
      props: { line: lineItem },
    });

    // @ts-expect-error - access internal state
    wrapper.vm.quantity = 5;
    // intermediate cart state arrives while still mutating
    await wrapper.setProps({ line: { ...lineItem, quantity: 3 } });
    // @ts-expect-error - access internal state
    expect(wrapper.vm.quantity).toBe(5);

    isMutating.value = false;
    await nextTick();
    // @ts-expect-error - access internal state
    expect(wrapper.vm.quantity).toBe(3);
  });

  it("removes the item from the stepper at quantity 1", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { line: { ...lineItem, quantity: 1 } },
    });

    await wrapper
      .find('button[aria-label="Pizza Margherita entfernen"]')
      .trigger("click");
    expect(mockRemoveLine).toHaveBeenCalledWith("li-1");
  });

  it("removes the item through the mutation queue and disables the button while mutating", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { line: lineItem, withQuantityInput: false },
    });

    const button = wrapper.find(
      'button[aria-label="Pizza Margherita entfernen"]',
    );
    await button.trigger("click");
    expect(mockRemoveLine).toHaveBeenCalledWith("li-1");

    isMutating.value = true;
    await nextTick();
    expect(
      wrapper
        .find('button[aria-label="Pizza Margherita entfernen"]')
        .attributes("disabled"),
    ).toBeDefined();
  });

  it("names the line as the receipt does, with its variant and price", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: {
        line: cartLine({
          name: "Pizza Salami",
          variant: [{ group: "Größe", option: "Groß 40 cm" }],
          extras: [{ id: "x1", name: "Extra Käse", unitPrice: eur(150) }],
          removedIngredients: ["Zwiebeln"],
          totalPrice: eur(1250),
        }),
      },
    });

    expect(wrapper.find("h3").text()).toBe(
      "Pizza Salami +Extra Käse -Zwiebeln",
    );
    expect(wrapper.text()).toContain("Größe: Groß 40 cm");
    expect(wrapper.text()).toContain("12.5 €");
  });
});
