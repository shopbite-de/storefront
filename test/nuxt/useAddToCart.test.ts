import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";

import { useAddToCart } from "~/composables/useAddToCart";
import type { CartLineRequest } from "~/composables/useCartMutations";
import type { Extra } from "../../shared/domain";
import { nextTick } from "vue";
import { dish, eur, variant } from "../support/dishes";
import { cart } from "../support/cart";

const { mockAddLine, mockTriggerCartItemAdded, mockTrackEvent } = vi.hoisted(
  () => ({
    mockAddLine: vi.fn(),
    mockTriggerCartItemAdded: vi.fn(),
    mockTrackEvent: vi.fn(),
  }),
);

mockNuxtImport("useCartMutations", () => () => ({ addLine: mockAddLine }));
mockNuxtImport("useProductEvents", () => () => ({
  triggerCartItemAdded: mockTriggerCartItemAdded,
}));
mockNuxtImport("useTrackEvent", () => () => ({
  trackAddToCart: mockTrackEvent,
}));

describe("useAddToCart", () => {
  const mockProduct = dish({
    id: "product-123",
    number: "SW10123",
    name: "Test Pizza",
    ingredients: [
      { id: "onions", name: "Zwiebeln" },
      { id: "olives", name: "Oliven" },
    ],
  });
  const cheese: Extra = {
    id: "cheese",
    number: "900",
    name: "Extra Cheese",
    price: eur(100),
    available: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddLine.mockResolvedValue(cart());
  });

  it("should initialize with default values", () => {
    const {
      selectedDish,
      selectedExtras,
      removedIngredients,
      selectedQuantity,
      isLoading,
    } = useAddToCart();

    expect(selectedDish.value).toBeNull();
    expect(selectedExtras.value).toEqual([]);
    expect(removedIngredients.value).toEqual([]);
    expect(selectedQuantity.value).toBe(1);
    expect(isLoading.value).toBe(false);
  });

  it("should set the selected dish", () => {
    const { setSelectedDish, selectedDish } = useAddToCart();
    setSelectedDish(mockProduct);
    expect(selectedDish.value).toEqual(mockProduct);
  });

  it("should generate correct cartItemLabel for simple product", async () => {
    const { setSelectedDish, cartItemLabel } = useAddToCart();
    setSelectedDish(mockProduct);
    await nextTick();
    expect(cartItemLabel.value).toBe("Test Pizza");
  });

  it("should generate correct cartItemLabel with extras and deselected ingredients", async () => {
    const {
      setSelectedDish,
      setSelectedExtras,
      setRemovedIngredients,
      cartItemLabel,
    } = useAddToCart();
    setSelectedDish(mockProduct);
    setSelectedExtras([cheese]);
    setRemovedIngredients(["Zwiebeln"]);
    await nextTick();
    expect(cartItemLabel.value).toBe("Test Pizza +Extra Cheese -Zwiebeln");
  });

  it("adds a plain dish without extras and removals", async () => {
    const { setSelectedDish, addToCart, isLoading } = useAddToCart();
    setSelectedDish(mockProduct);

    await addToCart();

    expect(isLoading.value).toBe(false);
    expect(mockAddLine).toHaveBeenCalledWith({
      dishId: "product-123",
      variantId: null,
      extraIds: [],
      removedIngredientIds: [],
      quantity: 1,
    });
    expect(mockTriggerCartItemAdded).toHaveBeenCalledWith(mockProduct, 1);
    expect(mockTrackEvent).toHaveBeenCalledWith(mockProduct, 1);
  });

  it("orders a variant of its dish", async () => {
    const { setSelectedDish, addToCart, selectedQuantity } = useAddToCart();
    setSelectedDish(variant({ id: "v21-gross" }), "d21");
    selectedQuantity.value = 2;

    await addToCart();

    expect(mockAddLine).toHaveBeenCalledWith(
      expect.objectContaining({
        dishId: "d21",
        variantId: "v21-gross",
        quantity: 2,
      }),
    );
  });

  it("should not report success when adding to cart failed", async () => {
    const { setSelectedDish, addToCart, isLoading } = useAddToCart();
    setSelectedDish(mockProduct);

    // useCartMutations reports the failure itself and resolves undefined
    mockAddLine.mockResolvedValue(undefined);

    await addToCart();

    expect(isLoading.value).toBe(false);
    expect(mockTriggerCartItemAdded).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should reset isLoading when the mutation throws", async () => {
    const { setSelectedDish, addToCart, isLoading } = useAddToCart();
    setSelectedDish(mockProduct);

    mockAddLine.mockRejectedValue(new Error("boom"));

    await expect(addToCart()).rejects.toThrow("boom");
    expect(isLoading.value).toBe(false);
  });

  describe("line identity of configured dishes", () => {
    async function addConfigured(
      without: string[],
      extras: Extra[] = [],
    ): Promise<CartLineRequest> {
      const {
        setSelectedDish,
        setSelectedExtras,
        setRemovedIngredients,
        addToCart,
      } = useAddToCart();
      setSelectedDish(mockProduct);
      setSelectedExtras(extras);
      setRemovedIngredients(without);
      await addToCart();
      return mockAddLine.mock.calls.at(-1)![0];
    }

    const asSet = (request: CartLineRequest) => ({
      ...request,
      extraIds: [...request.extraIds].sort(),
      removedIngredientIds: [...request.removedIngredientIds].sort(),
    });

    it("sends the removed ingredients by id, in the guest's order", async () => {
      const request = await addConfigured(["Zwiebeln", "Oliven"], [cheese]);

      expect(request).toEqual({
        dishId: "product-123",
        variantId: null,
        extraIds: ["cheese"],
        removedIngredientIds: ["onions", "olives"],
        quantity: 1,
      });
    });

    it("keeps dishes that differ only in removed ingredients apart", async () => {
      const withoutOnions = await addConfigured(["Zwiebeln"]);
      const withoutOlives = await addConfigured(["Oliven"]);
      const extrasOnly = await addConfigured([], [cheese]);
      const withExtras = await addConfigured(["Zwiebeln"], [cheese]);

      expect(withoutOnions.removedIngredientIds).toEqual(["onions"]);
      expect(withoutOlives.removedIngredientIds).toEqual(["olives"]);
      expect(extrasOnly.removedIngredientIds).toEqual([]);
      expect(asSet(withExtras)).not.toEqual(asSet(extrasOnly));
    });

    it("sends the same configuration whatever the order, blanks and repeats", async () => {
      const a = await addConfigured(["Zwiebeln", "Oliven"]);
      const b = await addConfigured(["Oliven", "Zwiebeln"]);
      const c = await addConfigured([" Oliven", "Zwiebeln ", "Oliven", ""]);

      expect(asSet(b)).toEqual(asSet(a));
      expect(asSet(c)).toEqual(asSet(a));
    });

    it("leaves out names the dish has no ingredient for", async () => {
      const request = await addConfigured(["Blattgold"]);

      expect(request.removedIngredientIds).toEqual([]);
    });
  });
});
