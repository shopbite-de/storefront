import { describe, expect, it } from "vitest";
import {
  cartLineHoldsDish,
  cartLineLabel,
  dietLabels,
  dishForNumber,
  foodLabelText,
  orderableOf,
  variantAsDish,
} from "../../app/utils/dish";
import { dish, eur, pizzaWithSizes, variant } from "../support/dishes";
import { cartLine } from "../support/cart";

describe("dietLabels", () => {
  it("names the diets as the menu card shows them", () => {
    expect(dietLabels(["vegetarian"])).toEqual(["Vegetarisch"]);
    expect(dietLabels(["vegan"])).toEqual(["Vegan"]);
    expect(dietLabels([])).toEqual([]);
  });
});

describe("foodLabelText", () => {
  it("writes plain text", () => {
    expect(
      foodLabelText({
        allergens: [
          { code: "A", name: "Weizen" },
          { code: "G", name: "Milch" },
        ],
        additives: [{ code: "1", name: "mit Farbstoff" }],
        checked: true,
      }),
    ).toBe("Enthält: Weizen, Milch. Zusatzstoffe: mit Farbstoff.");
    expect(foodLabelText({ allergens: [], additives: [], checked: true })).toBe(
      "",
    );
  });
});

describe("variantAsDish", () => {
  it("is the variant with the dish's description, diets and food labels", () => {
    const detail = pizzaWithSizes();
    expect(variantAsDish(detail, variant())).toMatchObject({
      id: "v21-gross",
      number: "21-groß",
      name: "Pizza Margherita",
      description: "Mit Tomatensoße und Käse",
      price: eur(1000),
      priceFrom: false,
      needsChoice: false,
      diets: ["vegetarian"],
    });
  });
});

describe("dishForNumber", () => {
  it("is the selected variant when the number is a variant's", () => {
    const detail = pizzaWithSizes({ selectedVariantId: "v21-gross" });
    expect(dishForNumber(detail, "21-groß").id).toBe("v21-gross");
  });

  it("is the dish itself for the dish's number", () => {
    const detail = pizzaWithSizes();
    expect(dishForNumber(detail, "21")).toMatchObject({
      id: "d21",
      needsChoice: true,
    });
  });
});

describe("orderableOf", () => {
  it("is the selected variant of a dish with variants", () => {
    expect(orderableOf(pizzaWithSizes())).toMatchObject({
      id: "v21-normal",
      number: "21-normal",
      price: eur(700),
    });
  });

  it("is the dish without variants", () => {
    expect(
      orderableOf(pizzaWithSizes({ variants: [], selectedVariantId: null })).id,
    ).toBe("d21");
  });
});

describe("cartLineHoldsDish", () => {
  const line = (
    dishId: string,
    variantId: string | null,
    extraIds: string[] = [],
  ) =>
    cartLine({
      configuration: { dishId, variantId, extraIds, removedIngredientIds: [] },
    });

  it("matches a line of the dish, or of the variant it orders", () => {
    expect(cartLineHoldsDish(line("d21", null), "d21")).toBe(true);
    expect(cartLineHoldsDish(line("d22", null), "d21")).toBe(false);
    expect(cartLineHoldsDish(line("d21", "v21-gross"), "v21-gross")).toBe(true);
    // the dish of a variant line is not what the line orders
    expect(cartLineHoldsDish(line("d21", "v21-gross"), "d21")).toBe(false);
  });

  it("matches a line carrying the dish as an extra", () => {
    expect(cartLineHoldsDish(line("d21", null, ["x900"]), "x900")).toBe(true);
  });
});

describe("cartLineLabel", () => {
  it("names the line as the receipt does", () => {
    expect(cartLineLabel(cartLine())).toBe("Pizza Margherita");
    expect(
      cartLineLabel(
        cartLine({
          extras: [{ id: "x1", name: "Extra Käse", unitPrice: eur(150) }],
          removedIngredients: ["Zwiebeln", "Oliven"],
        }),
      ),
    ).toBe("Pizza Margherita +Extra Käse -Zwiebeln -Oliven");
  });
});

describe("a dish card", () => {
  it("is the dish from the BFF unchanged", () => {
    expect(dish().foodLabels.checked).toBe(false);
  });
});
