import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useCartUpsell } from "~/composables/useCartUpsell";
import type { Schemas } from "#shopware";

const {
  mockInvoke,
  mockAddLineItems,
  mockTriggerCartItemAdded,
  mockTrackUpsellAdd,
} = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockAddLineItems: vi.fn(),
  mockTriggerCartItemAdded: vi.fn(),
  mockTrackUpsellAdd: vi.fn(),
}));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mockInvoke },
}));
mockNuxtImport("useCartMutations", () => () => ({
  addLineItems: mockAddLineItems,
}));
mockNuxtImport("useProductEvents", () => () => ({
  triggerCartItemAdded: mockTriggerCartItemAdded,
}));
mockNuxtImport("useTrackEvent", () => () => ({
  trackUpsellAdd: mockTrackUpsellAdd,
}));

const tiramisu = {
  id: "tiramisu",
  productNumber: "D1",
  translated: { name: "Tiramisu" },
} as unknown as Schemas["Product"];

describe("useCartUpsell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the flagged products without variant parents", async () => {
    mockInvoke.mockResolvedValue({ data: { elements: [tiramisu] } });

    const result = await useCartUpsell().loadUpsellProducts();

    expect(result).toEqual([tiramisu]);
    expect(mockInvoke).toHaveBeenCalledWith(
      "readProduct post /product",
      expect.objectContaining({
        headers: { "sw-inheritance": "true" },
        body: expect.objectContaining({
          limit: 6,
          filter: [
            {
              type: "equals",
              field: "customFields.shopbite_cart_upsell",
              value: true,
            },
            // Variants have no child count (null), main products 0.
            {
              type: "multi",
              operator: "or",
              queries: [
                { type: "equals", field: "childCount", value: 0 },
                { type: "equals", field: "childCount", value: null },
              ],
            },
          ],
        }),
      }),
    );
  });

  it("returns an empty list when the request fails", async () => {
    mockInvoke.mockRejectedValue(new Error("Network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await useCartUpsell().loadUpsellProducts()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("adds the product with quantity 1 and reports the add", async () => {
    mockAddLineItems.mockResolvedValue({ id: "cart" });

    await useCartUpsell().addUpsellProduct(tiramisu);

    expect(mockAddLineItems).toHaveBeenCalledWith([
      { id: "tiramisu", quantity: 1, type: "product" },
    ]);
    expect(mockTriggerCartItemAdded).toHaveBeenCalledWith(tiramisu, 1);
    expect(mockTrackUpsellAdd).toHaveBeenCalledWith(tiramisu, 1);
  });

  it("reports nothing when the add failed", async () => {
    // useCartMutations shows the error toast itself and resolves undefined.
    mockAddLineItems.mockResolvedValue(undefined);

    await useCartUpsell().addUpsellProduct(tiramisu);

    expect(mockTriggerCartItemAdded).not.toHaveBeenCalled();
    expect(mockTrackUpsellAdd).not.toHaveBeenCalled();
  });

  it("marks the product as pending while the add is queued", async () => {
    let resolveAdd: (cart: unknown) => void = () => {};
    mockAddLineItems.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    const { addUpsellProduct, isAdding } = useCartUpsell();

    const adding = addUpsellProduct(tiramisu);
    expect(isAdding("tiramisu")).toBe(true);

    // A second click while queued does not add the product twice.
    await addUpsellProduct(tiramisu);
    expect(mockAddLineItems).toHaveBeenCalledTimes(1);

    resolveAdd({ id: "cart" });
    await adding;
    expect(isAdding("tiramisu")).toBe(false);
  });
});
