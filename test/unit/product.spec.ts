import { describe, expect, it } from "vitest";
import type { Schemas } from "#shopware";
import {
  allergensChecked,
  foodLabelText,
  getDiets,
  getFoodLabels,
  getMainIngredients,
  hasYesOption,
  lineItemHoldsProduct,
  productIsAvailable,
  productNeedsChoice,
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

describe("productNeedsChoice", () => {
  it("is true for a parent with variants", () => {
    expect(productNeedsChoice(product({ childCount: 3 }))).toBe(true);
  });

  it("is false without variants or without the field", () => {
    expect(productNeedsChoice(product({ childCount: 0 }))).toBe(false);
    expect(productNeedsChoice(product())).toBe(false);
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

const labelGroup = (name: string, options: [string, string][]) =>
  ({
    translated: { name },
    options: options.map(([code, option], i) => ({
      id: `${name}${i}`,
      translated: { name: option, customFields: { shopbite_code: code } },
    })),
  }) as unknown as Schemas["PropertyGroup"];

const withLabels = () => [
  group("Hauptzutaten", ["Tomaten"]),
  labelGroup("Allergene", [
    ["A", "Weizen"],
    ["A", "Dinkel"],
    ["G", "Milch (inkl. Laktose)"],
  ]),
  labelGroup("Zusatzstoffe", [["2", "mit Konservierungsstoff"]]),
];

describe("food labels (#485)", () => {
  it("reads allergens and additives with their codes", () => {
    const labels = getFoodLabels(withLabels());
    expect(labels.allergens.map((label) => label.code)).toEqual([
      "A",
      "A",
      "G",
    ]);
    expect(labels.additives).toEqual([
      { code: "2", name: "mit Konservierungsstoff" },
    ]);
    expect(getFoodLabels(undefined)).toEqual({ allergens: [], additives: [] });
  });

  it("writes plain text", () => {
    const labels = getFoodLabels(withLabels());
    expect(foodLabelText(labels)).toBe(
      "Enthält: Weizen, Dinkel, Milch (inkl. Laktose). Zusatzstoffe: mit Konservierungsstoff.",
    );
    expect(foodLabelText({ allergens: [], additives: [] })).toBe("");
  });

  it("knows whether the restaurant checked the lists", () => {
    expect(
      allergensChecked(
        product({
          translated: { customFields: { shopbite_allergens_checked: true } },
        } as unknown as Partial<Schemas["Product"]>),
      ),
    ).toBe(true);
    expect(allergensChecked(product())).toBe(false);
  });
});
