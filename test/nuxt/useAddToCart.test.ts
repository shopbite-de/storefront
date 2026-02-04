import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";

import { useAddToCart } from "../../app/composables/useAddToCart";
import { nextTick } from "vue";

// Use vi.hoisted for variables used in mocks
const {
  mockAddProducts,
  mockRefreshCart,
  mockToastAdd,
  mockTriggerProductAdded,
  mockTrackEvent,
} = vi.hoisted(() => ({
  mockAddProducts: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockToastAdd: vi.fn(),
  mockTriggerProductAdded: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

mockNuxtImport("useCart", () => {
  return () => ({
    addProducts: mockAddProducts,
    refreshCart: mockRefreshCart,
  });
});

mockNuxtImport("useToast", () => {
  return () => ({
    add: mockToastAdd,
  });
});

mockNuxtImport("useProductEvents", () => {
  return () => ({
    triggerProductAdded: mockTriggerProductAdded,
  });
});

mockNuxtImport("useTrackEvent", () => {
  return () => ({
    trackAddToCart: mockTrackEvent,
  });
});

// Provide the mocks globally or in a way that they are picked up
vi.stubGlobal("useCart", () => ({
  addProducts: mockAddProducts,
  refreshCart: mockRefreshCart,
}));
vi.stubGlobal("useToast", () => ({
  add: mockToastAdd,
}));
vi.stubGlobal("useProductEvents", () => ({
  triggerProductAdded: mockTriggerProductAdded,
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
  } as any;

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
    setSelectedExtras([{ label: "Extra Cheese", value: "cheese" }] as any);
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
    expect(mockRefreshCart).toHaveBeenCalled();
    expect(mockToastAdd).toHaveBeenCalled();
    expect(mockTriggerProductAdded).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(mockProduct, 1);
  });

  it("should add product with extras to cart as container", async () => {
    const { setSelectedProduct, setSelectedExtras, addToCart } = useAddToCart();
    setSelectedProduct(mockProduct);
    setSelectedExtras([{ label: "Extra Cheese", value: "cheese" }] as any);

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
});
