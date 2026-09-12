import { describe, expect, it } from "vitest";
import type { Schemas } from "#shopware";
import {
  getMainIngredients,
  productHasOptions,
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

describe("productHasOptions", () => {
  it("is false for a plain product", () => {
    expect(productHasOptions(product())).toBe(false);
    expect(
      productHasOptions(product({ childCount: 0, crossSellings: [] })),
    ).toBe(false);
  });

  it("is true for a product with variants", () => {
    expect(productHasOptions(product({ childCount: 3 }))).toBe(true);
  });

  it("is true for a product with an active cross-selling", () => {
    expect(
      productHasOptions(
        product({
          crossSellings: [
            { id: "c1", active: true },
          ] as unknown as Schemas["ProductCrossSelling"][],
        }),
      ),
    ).toBe(true);
  });

  it("ignores inactive cross-sellings", () => {
    expect(
      productHasOptions(
        product({
          crossSellings: [
            { id: "c1", active: false },
          ] as unknown as Schemas["ProductCrossSelling"][],
        }),
      ),
    ).toBe(false);
  });
});

describe("productIsAvailable", () => {
  it("treats a missing flag as available", () => {
    expect(productIsAvailable(product())).toBe(true);
    expect(productIsAvailable(product({ available: true }))).toBe(true);
  });

  it("is false when the flag is false", () => {
    expect(productIsAvailable(product({ available: false }))).toBe(false);
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
