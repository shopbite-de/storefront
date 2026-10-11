import { describe, expect, it } from "vitest";
import type { Schemas } from "#shopware";
import { findCategory, groupBySubsections } from "../../app/utils/menuGroups";

const category = (
  id: string,
  name: string,
  children: Schemas["Category"][] = [],
) =>
  ({
    id,
    name,
    translated: { name },
    children,
  }) as unknown as Schemas["Category"];
const product = (id: string, categoryIds: string[]) =>
  ({ id, categoryIds }) as unknown as Schemas["Product"];

const nudeln = category("nudeln", "Nudeln", [
  category("spaghetti", "Spaghetti"),
  category("penne", "Penne", [category("penne-al-forno", "Al forno")]),
  category("leer", "Leer"),
]);

describe("groupBySubsections (#487)", () => {
  it("groups dishes by sub-section in navigation order, direct dishes first", () => {
    const result = groupBySubsections(
      [
        product("p1", ["penne"]),
        product("p2", ["spaghetti"]),
        product("p3", ["nudeln"]),
        product("p4", ["penne-al-forno"]),
      ],
      nudeln.children,
    );
    expect(result?.direct.map((p) => p.id)).toEqual(["p3"]);
    expect(
      result?.groups.map((g) => [g.name, g.products.map((p) => p.id)]),
    ).toEqual([
      ["Spaghetti", ["p2"]],
      ["Penne", ["p1", "p4"]],
    ]);
  });

  it("is null for a section without sub-sections", () => {
    expect(groupBySubsections([product("p1", ["pizza"])], [])).toBeNull();
  });

  it("finds a category anywhere in the tree", () => {
    expect(
      findCategory([category("pizza", "Pizza"), nudeln], "penne-al-forno")
        ?.name,
    ).toBe("Al forno");
    expect(findCategory([nudeln], "x")).toBeUndefined();
  });
});
