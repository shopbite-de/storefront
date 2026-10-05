import { describe, expect, it } from "vitest";
import type { Schemas } from "#shopware";
import {
  getDiets,
  getMainIngredients,
  hasYesOption,
  lineItemHoldsProduct,
  productIsAvailable,
} from "../../app/utils/product";

const product = (overrides: Partial<Schemas["Product"]> = {}) =>
  ({ id: "p1", ...overrides }) as Schemas["Product"];

const group = (name: string, options: string[]) =>
  ({
    translated: { name },
    options: options.map((option, i) => ({
      id: `o${i}`,
      translated: { name: option },
    })),
  }) as unknown as Schemas["PropertyGroup"];

describe("productIsAvailable", () => {
  it("treats a missing flag as available", () => {
    expect(productIsAvailable(product())).toBe(true);
    expect(productIsAvailable(product({ available: true }))).toBe(true);
  });

  it("is false when the flag is false", () => {
    expect(productIsAvailable(product({ available: false }))).toBe(false);
  });
});

describe("lineItemHoldsProduct", () => {
  const lineItem = (overrides: Partial<Schemas["LineItem"]>) =>
    ({ id: "li", type: "product", ...overrides }) as Schemas["LineItem"];

  it("matches a plain line item of the product", () => {
    expect(lineItemHoldsProduct(lineItem({ referencedId: "p1" }), "p1")).toBe(
      true,
    );
    expect(lineItemHoldsProduct(lineItem({ referencedId: "p2" }), "p1")).toBe(
      false,
    );
  });

  it("matches a container item carrying the product", () => {
    const container = {
      id: "li",
      type: "container",
      children: [{ id: "child", type: "product", referencedId: "p1" }],
    } as unknown as Schemas["LineItem"];
    expect(lineItemHoldsProduct(container, "p1")).toBe(true);
    expect(lineItemHoldsProduct(container, "p2")).toBe(false);
  });
});

describe("getMainIngredients", () => {
  it("returns the options of the Hauptzutaten group", () => {
    const options = getMainIngredients([
      group("Vegetarisch", ["Ja"]),
      group("Hauptzutaten", ["Tomatensoße", "Mozzarella"]),
    ]);
    expect(options.map((o) => o.translated.name)).toEqual([
      "Tomatensoße",
      "Mozzarella",
    ]);
  });

  it("is empty without the group", () => {
    expect(getMainIngredients(undefined)).toEqual([]);
    expect(getMainIngredients([group("Küche", ["Italienisch"])])).toEqual([]);
  });
});

describe("hasYesOption", () => {
  it("needs the option Ja in the named group", () => {
    const properties = [group("Vegetarisch", ["Ja"]), group("Vegan", ["Nein"])];
    expect(hasYesOption(properties, "Vegetarisch")).toBe(true);
    expect(hasYesOption(properties, "Vegan")).toBe(false);
    expect(hasYesOption(undefined, "Vegetarisch")).toBe(false);
  });
});

describe("getDiets", () => {
  it("returns the marked diets", () => {
    expect(
      getDiets([group("Vegetarisch", ["Ja"]), group("Vegan", ["Ja"])]),
    ).toEqual(["vegetarian", "vegan"]);
    expect(getDiets([group("Hauptzutaten", ["Salami"])])).toEqual([]);
  });
});
