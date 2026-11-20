import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport, registerEndpoint } from "@nuxt/test-utils/runtime";
import { useCartUpsell } from "~/composables/useCartUpsell";
import { dish } from "../support/dishes";

const {
  mockUpsell,
  mockAddLineItems,
  mockTriggerCartItemAdded,
  mockTrackUpsellAdd,
} = vi.hoisted(() => ({
  mockUpsell: vi.fn(),
  mockAddLineItems: vi.fn(),
  mockTriggerCartItemAdded: vi.fn(),
  mockTrackUpsellAdd: vi.fn(),
}));

registerEndpoint("/api/menu/upsell", () => mockUpsell());
mockNuxtImport("useCartMutations", () => () => ({
  addLineItems: mockAddLineItems,
}));
mockNuxtImport("useProductEvents", () => () => ({
  triggerCartItemAdded: mockTriggerCartItemAdded,
}));
mockNuxtImport("useTrackEvent", () => () => ({
  trackUpsellAdd: mockTrackUpsellAdd,
}));

const tiramisu = dish({ id: "tiramisu", number: "D1", name: "Tiramisu" });

describe("useCartUpsell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the suggested dishes from the BFF", async () => {
    mockUpsell.mockReturnValue([tiramisu]);

    expect(await useCartUpsell().loadUpsellDishes()).toEqual([tiramisu]);
  });

  it("returns an empty list when the request fails", async () => {
    mockUpsell.mockImplementation(() => {
      throw new Error("Network error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await useCartUpsell().loadUpsellDishes()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("adds the dish with quantity 1 and reports the add", async () => {
    mockAddLineItems.mockResolvedValue({ id: "cart" });

    await useCartUpsell().addUpsellDish(tiramisu);

    expect(mockAddLineItems).toHaveBeenCalledWith([
      { id: "tiramisu", quantity: 1, type: "product" },
    ]);
    expect(mockTriggerCartItemAdded).toHaveBeenCalledWith(tiramisu, 1);
    expect(mockTrackUpsellAdd).toHaveBeenCalledWith(tiramisu, 1);
  });

  it("reports nothing when the add failed", async () => {
    // useCartMutations re-syncs the cart itself and resolves undefined.
    mockAddLineItems.mockResolvedValue(undefined);

    await useCartUpsell().addUpsellDish(tiramisu);

    expect(mockTriggerCartItemAdded).not.toHaveBeenCalled();
    expect(mockTrackUpsellAdd).not.toHaveBeenCalled();
  });

  it("marks the dish as pending while the add is queued", async () => {
    let resolveAdd: (cart: unknown) => void = () => {};
    mockAddLineItems.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    const { addUpsellDish, isAdding } = useCartUpsell();

    const adding = addUpsellDish(tiramisu);
    expect(isAdding("tiramisu")).toBe(true);

    // A second click while queued does not add the dish twice.
    await addUpsellDish(tiramisu);
    expect(mockAddLineItems).toHaveBeenCalledTimes(1);

    resolveAdd({ id: "cart" });
    await adding;
    expect(isAdding("tiramisu")).toBe(false);
  });
});
