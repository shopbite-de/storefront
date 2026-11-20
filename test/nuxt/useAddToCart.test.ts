import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";

import { useAddToCart } from "~/composables/useAddToCart";
import type { Schemas } from "#shopware";
import { nextTick } from "vue";
import { v5 as uuidv5 } from "uuid";

// Use vi.hoisted for variables used in mocks
const {
  mockAddProducts,
  mockRefreshCart,
  mockTriggerCartItemAdded,
  mockTrackEvent,
} = vi.hoisted(() => ({
  mockAddProducts: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockTriggerCartItemAdded: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

mockNuxtImport("useCartMutations", () => {
  return () => ({
    addLineItems: mockAddProducts,
  });
});

mockNuxtImport("useCart", () => {
  return () => ({
    addProducts: mockAddProducts,
    refreshCart: mockRefreshCart,
  });
});

mockNuxtImport("useProductEvents", () => {
  return () => ({
    triggerCartItemAdded: mockTriggerCartItemAdded,
  });
});

mockNuxtImport("useTrackEvent", () => {
  return () => ({
    trackAddToCart: mockTrackEvent,
  });
});

// Provide the mocks globally or in a way that they are picked up
vi.stubGlobal("useCartMutations", () => ({
  addLineItems: mockAddProducts,
}));
vi.stubGlobal("useCart", () => ({
  addProducts: mockAddProducts,
  refreshCart: mockRefreshCart,
}));
vi.stubGlobal("useProductEvents", () => ({
  triggerCartItemAdded: mockTriggerCartItemAdded,
}));
vi.stubGlobal("useTrackEvent", () => ({
  trackAddToCart: mockTrackEvent,
}));

describe("useAddToCart", () => {
  const mockProduct = {
    id: "product-123",
    productNumber: "SW10123",
    translated: {
      name: "Test Pizza",
    },
  } as unknown as Schemas["Product"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const {
      selectedProduct,
      selectedExtras,
      deselectedIngredients,
      selectedQuantity,
      isLoading,
    } = useAddToCart();

    expect(selectedProduct.value).toBeNull();
    expect(selectedExtras.value).toEqual([]);
    expect(deselectedIngredients.value).toEqual([]);
    expect(selectedQuantity.value).toBe(1);
    expect(isLoading.value).toBe(false);
  });

  it("should set selected product", () => {
    const { setSelectedProduct, selectedProduct } = useAddToCart();
    setSelectedProduct(mockProduct);
    expect(selectedProduct.value).toEqual(mockProduct);
  });

  it("should generate correct cartItemLabel for simple product", async () => {
    const { setSelectedProduct, cartItemLabel } = useAddToCart();
    setSelectedProduct(mockProduct);
    await nextTick();
    expect(cartItemLabel.value).toBe("Test Pizza");
  });

  it("should generate correct cartItemLabel with extras and deselected ingredients", async () => {
    const {
      setSelectedProduct,
      setSelectedExtras,
      setDeselectedIngredients,
      cartItemLabel,
    } = useAddToCart();
    setSelectedProduct(mockProduct);
    setSelectedExtras([{ label: "Extra Cheese", value: "cheese", price: "" }]);
    setDeselectedIngredients(["Onions"]);
    await nextTick();
    expect(cartItemLabel.value).toBe("Test Pizza +Extra Cheese -Onions");
  });

  it("should add simple product to cart", async () => {
    const { setSelectedProduct, addToCart, isLoading } = useAddToCart();
    setSelectedProduct(mockProduct);

    mockAddProducts.mockResolvedValue({ id: "cart-123" });
    mockRefreshCart.mockResolvedValue({});

    await addToCart();

    expect(isLoading.value).toBe(false);
    expect(mockAddProducts).toHaveBeenCalledWith([
      {
        id: "product-123",
        quantity: 1,
        type: "product",
      },
    ]);
    expect(mockTriggerCartItemAdded).toHaveBeenCalledWith(mockProduct, 1);
    expect(mockTrackEvent).toHaveBeenCalledWith(mockProduct, 1);
  });

  it("should not report success when adding to cart failed", async () => {
    const { setSelectedProduct, addToCart, isLoading } = useAddToCart();
    setSelectedProduct(mockProduct);

    // useCartMutations reports the failure itself and resolves undefined
    mockAddProducts.mockResolvedValue(undefined);

    await addToCart();

    expect(isLoading.value).toBe(false);
    expect(mockTriggerCartItemAdded).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should reset isLoading when the mutation throws", async () => {
    const { setSelectedProduct, addToCart, isLoading } = useAddToCart();
    setSelectedProduct(mockProduct);

    mockAddProducts.mockRejectedValue(new Error("boom"));

    await expect(addToCart()).rejects.toThrow("boom");
    expect(isLoading.value).toBe(false);
  });

  it("should add product with extras to cart as container", async () => {
    const { setSelectedProduct, setSelectedExtras, addToCart } = useAddToCart();
    setSelectedProduct(mockProduct);
    setSelectedExtras([{ label: "Extra Cheese", value: "cheese", price: "" }]);

    mockAddProducts.mockResolvedValue({ id: "cart-123" });

    await addToCart();

    expect(mockAddProducts).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "container",
        children: expect.arrayContaining([
          expect.objectContaining({
            type: "product",
            referencedId: "product-123",
          }),
          expect.objectContaining({
            type: "product",
            id: "cheese",
          }),
        ]),
      }),
    ]);
  });
  describe("line identity of configured dishes", () => {
    const extra = { label: "Extra Cheese", value: "cheese", price: "" };

    async function addConfigured(
      without: string[],
      extras: (typeof extra)[] = [],
    ) {
      const {
        setSelectedProduct,
        setSelectedExtras,
        setDeselectedIngredients,
        addToCart,
      } = useAddToCart();
      setSelectedProduct(mockProduct);
      setSelectedExtras(extras);
      setDeselectedIngredients(without);
      mockAddProducts.mockResolvedValue({ id: "cart-123" });
      await addToCart();
      const items = mockAddProducts.mock.calls.at(-1)![0];
      return items[0] as {
        id: string;
        type: string;
        label: string;
        payload: { productNumber: string; without: string[] };
      };
    }

    it("keeps dishes that differ only in removed ingredients apart", async () => {
      const withoutOnions = await addConfigured(["Zwiebeln"]);
      const withoutOlives = await addConfigured(["Oliven"]);

      expect(withoutOnions.type).toBe("container");
      expect(withoutOlives.type).toBe("container");
      expect(withoutOnions.id).not.toBe(withoutOlives.id);
      expect(withoutOnions.label).toBe("Test Pizza -Zwiebeln");
      expect(withoutOlives.label).toBe("Test Pizza -Oliven");
    });

    it("keeps dishes with the same extras but other removals apart", async () => {
      const a = await addConfigured(["Zwiebeln"], [extra]);
      const b = await addConfigured(["Oliven"], [extra]);
      const c = await addConfigured([], [extra]);

      expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    });

    it("gives the same configuration the same id, so the cart adds up the quantity", async () => {
      const first = await addConfigured(["Zwiebeln", "Oliven"], [extra]);
      const second = await addConfigured(["Zwiebeln", "Oliven"], [extra]);

      expect(first.id).toBe(second.id);
    });

    it("does not depend on the order or case of the removed ingredients", async () => {
      const a = await addConfigured(["Zwiebeln", "Oliven"]);
      const b = await addConfigured(["Oliven", "Zwiebeln"]);
      const c = await addConfigured([" oliven", "ZWIEBELN "]);

      expect(b.id).toBe(a.id);
      expect(c.id).toBe(a.id);
    });

    it("keeps the id of dishes without removed ingredients", async () => {
      const item = await addConfigured([], [extra]);

      expect(item.id).toBe(
        uuidv5("product-123cheese", "b098ef7e-0fa2-4073-b002-7ceec4360fbf"),
      );
    });

    it("sends the removed ingredients as payload.without", async () => {
      const removed = await addConfigured(["Zwiebeln", "Oliven"]);
      const extrasOnly = await addConfigured([], [extra]);

      expect(removed.payload).toEqual({
        productNumber: "SW10123",
        without: ["Zwiebeln", "Oliven"],
      });
      expect(extrasOnly.payload).toEqual({
        productNumber: "SW10123",
        without: [],
      });
    });
  });
});
