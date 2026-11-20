import { describe, expect, it } from "vitest";
import type { MenuSection } from "../../shared/domain";
import { groupBySubsections } from "../../app/utils/menuGroups";
import { dish } from "../support/dishes";

const category = (
  id: string,
  name: string,
  children: MenuSection[] = [],
): MenuSection => ({
  id,
  name,
  description: null,
  icon: null,
  media: null,
  path: `/${name}/`,
  seo: { title: null, description: null, indexable: true },
  children,
});
const product = (id: string, sectionIds: string[]) => dish({ id, sectionIds });

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
      result?.groups.map((g) => [g.name, g.dishes.map((p) => p.id)]),
    ).toEqual([
      ["Spaghetti", ["p2"]],
      ["Penne", ["p1", "p4"]],
    ]);
  });

  it("is null for a section without sub-sections", () => {
    expect(groupBySubsections([product("p1", ["pizza"])], [])).toBeNull();
  });
});
