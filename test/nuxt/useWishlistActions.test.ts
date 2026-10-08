import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useWishlistActions } from "../../app/composables/useWishlistActions";
import type { Schemas } from "#shopware";

const {
  mockAddProducts,
  mockRefreshCart,
  mockTriggerProductAdded,
  mockClearWishlist,
  mockTrackEvent,
} = vi.hoisted(() => ({
  mockAddProducts: vi.fn(),
  mockRefreshCart: vi.fn(),
  mockTriggerProductAdded: vi.fn(),
  mockClearWishlist: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

mockNuxtImport("useCart", () => () => ({
  addProducts: mockAddProducts,
  refreshCart: mockRefreshCart,
}));

mockNuxtImport("useProductEvents", () => () => ({
  triggerProductAdded: mockTriggerProductAdded,
}));

mockNuxtImport("useWishlist", () => () => ({
  clearWishlist: mockClearWishlist,
}));

mockNuxtImport("useTrackEvent", () => () => ({
  trackAddToCart: mockTrackEvent,
}));

describe("useWishlistActions", () => {
  const mockProduct = {
    id: "prod-1",
    translated: { name: "Test Product" },
    productNumber: "SW123",
  } as unknown as Schemas["Product"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear wishlist", async () => {
    const { clearWishlistHandler, isLoading } = useWishlistActions();
    await clearWishlistHandler();
    expect(mockClearWishlist).toHaveBeenCalled();
    expect(isLoading.value).toBe(false);
  });

  it("should add single item to cart", async () => {
    const { addSingleItemToCart } = useWishlistActions();
    mockAddProducts.mockResolvedValue({ id: "cart-1" });

    await addSingleItemToCart(mockProduct);

    expect(mockAddProducts).toHaveBeenCalledWith([
      { id: "prod-1", quantity: 1, type: "product" },
    ]);
    expect(mockRefreshCart).toHaveBeenCalled();
    expect(mockTriggerProductAdded).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(mockProduct, 1);
  });

  it("should not add a base product with variants", async () => {
    const baseProduct = { ...mockProduct, childCount: 2 };
    const { addSingleItemToCart } = useWishlistActions();

    await addSingleItemToCart(baseProduct);

    expect(mockAddProducts).not.toHaveBeenCalled();
  });

  it("should add all items to cart", async () => {
    const products = [
      { id: "p1", translated: { name: "P1" } },
      { id: "p2", translated: { name: "P2" } },
    ] as unknown as Schemas["Product"][];
    const { addAllItemsToCart, isAddingToCart } = useWishlistActions();
    mockAddProducts.mockResolvedValue({ id: "cart-1" });

    await addAllItemsToCart(products);

    expect(mockAddProducts).toHaveBeenCalledWith([
      { id: "p1", quantity: 1, type: "product" },
      { id: "p2", quantity: 1, type: "product" },
    ]);
    expect(mockRefreshCart).toHaveBeenCalledWith({ id: "cart-1" });
    expect(isAddingToCart.value).toBe(false);
  });

  it("should handle empty products in addAllItemsToCart", async () => {
    const { addAllItemsToCart } = useWishlistActions();
    await addAllItemsToCart([]);
    expect(mockAddProducts).not.toHaveBeenCalled();
  });

  it("should skip base products in addAllItemsToCart", async () => {
    const products = [
      { id: "p1", translated: { name: "P1" } },
      { id: "p2", childCount: 1, translated: { name: "P2" } },
    ] as unknown as Schemas["Product"][];
    const { addAllItemsToCart } = useWishlistActions();
    mockAddProducts.mockResolvedValue({ id: "cart-1" });

    await addAllItemsToCart(products);

    expect(mockAddProducts).toHaveBeenCalledWith([
      { id: "p1", quantity: 1, type: "product" },
    ]);
    expect(mockTriggerProductAdded).toHaveBeenCalled();
  });
});
