import { describe, it, expect, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { nextTick, ref } from "vue";
import CartItem from "~/components/Cart/Item.vue";
import type { Schemas } from "#shopware";

const { mockSetQuantity, mockRemoveLineItem } = vi.hoisted(() => ({
  mockSetQuantity: vi.fn(),
  mockRemoveLineItem: vi.fn(),
}));

// Read lazily inside the factory, i.e. after module initialisation.
const isMutating = ref(false);

mockNuxtImport("useCartMutations", () => () => ({
  setQuantity: mockSetQuantity,
  removeLineItem: mockRemoveLineItem,
  addLineItems: vi.fn(),
  isMutating,
}));

mockNuxtImport("useCommercePrice", () => () => ({
  getFormattedPrice: (value: number) => `${value} €`,
}));

const lineItem = {
  id: "li-1",
  label: "Pizza Margherita",
  quantity: 2,
  type: "product",
  price: { totalPrice: 18 },
} as unknown as Schemas["LineItem"];

describe("CartItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMutating.value = false;
    mockSetQuantity.mockResolvedValue(undefined);
  });

  it("forwards each quantity change with the clicked value, based on the local state", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { cartItem: lineItem },
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
      props: { cartItem: lineItem },
    });

    // @ts-expect-error - access internal state
    wrapper.vm.quantity = 5;
    // intermediate cart state arrives while still mutating
    await wrapper.setProps({ cartItem: { ...lineItem, quantity: 3 } });
    // @ts-expect-error - access internal state
    expect(wrapper.vm.quantity).toBe(5);

    isMutating.value = false;
    await nextTick();
    // @ts-expect-error - access internal state
    expect(wrapper.vm.quantity).toBe(3);
  });

  it("removes the item through the mutation queue and disables the button while mutating", async () => {
    const wrapper = await mountSuspended(CartItem, {
      props: { cartItem: lineItem },
    });

    const button = wrapper.find('button[aria-label="Artikel entfernen"]');
    await button.trigger("click");
    expect(mockRemoveLineItem).toHaveBeenCalledWith(lineItem);

    isMutating.value = true;
    await nextTick();
    expect(
      wrapper
        .find('button[aria-label="Artikel entfernen"]')
        .attributes("disabled"),
    ).toBeDefined();
  });
});
