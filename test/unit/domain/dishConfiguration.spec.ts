import { describe, expect, it } from "vitest";
import {
  dishConfiguration,
  isPlainDish,
  isSameDishConfiguration,
  orderedDishId,
} from "../../../shared/domain";

describe("DishConfiguration", () => {
  it("keeps the chosen order of extras and removals, without repeats or blanks", () => {
    const configuration = dishConfiguration({
      dishId: " pizza-margherita ",
      variantId: "pizza-margherita-large",
      extraIds: ["olives", "ham", "olives", " "],
      removedIngredientIds: [" cheese", "basil", "", "cheese"],
    });
    expect(configuration).toEqual({
      dishId: "pizza-margherita",
      variantId: "pizza-margherita-large",
      extraIds: ["olives", "ham"],
      removedIngredientIds: ["cheese", "basil"],
    });
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(configuration.extraIds)).toBe(true);
    expect(Object.isFrozen(configuration.removedIngredientIds)).toBe(true);
  });

  it("has no variant unless one is chosen", () => {
    expect(dishConfiguration({ dishId: "d1" }).variantId).toBeNull();
    expect(
      dishConfiguration({ dishId: "d1", variantId: " " }).variantId,
    ).toBeNull();
  });

  it("needs a dish", () => {
    expect(() => dishConfiguration({ dishId: " " })).toThrowError(/dish/);
  });

  it("compares by dish, variant, extras and removals regardless of order", () => {
    const a = dishConfiguration({
      dishId: "d1",
      extraIds: ["x", "y"],
      removedIngredientIds: ["onion", "garlic"],
    });
    const b = dishConfiguration({
      dishId: "d1",
      extraIds: ["y", "x"],
      removedIngredientIds: ["garlic", "onion"],
    });
    expect(isSameDishConfiguration(a, b)).toBe(true);
    expect(
      isSameDishConfiguration(
        a,
        dishConfiguration({ dishId: "d1", extraIds: ["x", "y"] }),
      ),
    ).toBe(false);
    expect(
      isSameDishConfiguration(
        dishConfiguration({ dishId: "d1", variantId: "v1" }),
        dishConfiguration({ dishId: "d1", variantId: "v2" }),
      ),
    ).toBe(false);
  });

  it("knows a plain dish (no extras, nothing removed)", () => {
    expect(
      isPlainDish(dishConfiguration({ dishId: "d1", variantId: "v1" })),
    ).toBe(true);
    expect(
      isPlainDish(dishConfiguration({ dishId: "d1", extraIds: ["x"] })),
    ).toBe(false);
    expect(
      isPlainDish(
        dishConfiguration({ dishId: "d1", removedIngredientIds: ["i"] }),
      ),
    ).toBe(false);
  });

  it("orders the variant if one is chosen, else the dish", () => {
    expect(orderedDishId(dishConfiguration({ dishId: "d1" }))).toBe("d1");
    expect(
      orderedDishId(dishConfiguration({ dishId: "d1", variantId: "v1" })),
    ).toBe("v1");
  });
});
