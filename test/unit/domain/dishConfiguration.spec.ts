import { describe, expect, it } from "vitest";
import {
  dishConfiguration,
  isPlainDish,
  isSameDishConfiguration,
} from "../../../shared/domain";

describe("DishConfiguration", () => {
  it("normalises extras and removed ingredients (trimmed, unique, sorted)", () => {
    const configuration = dishConfiguration({
      dishId: "pizza-margherita-large",
      extraIds: ["olives", "ham", "olives"],
      removedIngredients: [" Käse", "Basilikum", ""],
    });
    expect(configuration).toEqual({
      dishId: "pizza-margherita-large",
      extraIds: ["ham", "olives"],
      removedIngredients: ["Basilikum", "Käse"],
    });
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(configuration.extraIds)).toBe(true);
  });

  it("needs a dish", () => {
    expect(() => dishConfiguration({ dishId: " " })).toThrowError(/dish/);
  });

  it("compares by dish, extras and removals regardless of order", () => {
    const a = dishConfiguration({
      dishId: "d1",
      extraIds: ["x", "y"],
      removedIngredients: ["Zwiebeln"],
    });
    const b = dishConfiguration({
      dishId: "d1",
      extraIds: ["y", "x"],
      removedIngredients: ["Zwiebeln"],
    });
    const c = dishConfiguration({ dishId: "d1", extraIds: ["x"] });
    expect(isSameDishConfiguration(a, b)).toBe(true);
    expect(isSameDishConfiguration(a, c)).toBe(false);
  });

  it("knows a plain dish (no extras, nothing removed)", () => {
    expect(isPlainDish(dishConfiguration({ dishId: "d1" }))).toBe(true);
    expect(
      isPlainDish(dishConfiguration({ dishId: "d1", extraIds: ["x"] })),
    ).toBe(false);
  });
});
