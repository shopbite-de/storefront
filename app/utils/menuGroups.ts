import type { Dish, MenuSection } from "../../shared/domain";

/** A sub-section of a menu section with its dishes (#487). */
export interface MenuGroup {
  id: string;
  name: string;
  dishes: Dish[];
}

function idsBelow(section: MenuSection): string[] {
  return [section.id, ...section.children.flatMap(idsBelow)];
}

/**
 * Splits the dishes of a section into the ones directly in it and one group
 * per sub-section, in menu order (= backoffice order). Deeper levels count
 * to their sub-section; empty groups are left out, so a filter or search
 * shows only what matches. Without sub-sections: null.
 */
export function groupBySubsections(
  dishes: readonly Dish[],
  subsections: readonly MenuSection[] | undefined,
): { direct: Dish[]; groups: MenuGroup[] } | null {
  if (!subsections?.length) return null;
  const buckets = subsections.map((section) => ({
    group: { id: section.id, name: section.name, dishes: [] as Dish[] },
    ids: new Set(idsBelow(section)),
  }));
  const direct: Dish[] = [];
  for (const dish of dishes) {
    const bucket = buckets.find((b) =>
      dish.sectionIds.some((id) => b.ids.has(id)),
    );
    (bucket?.group.dishes ?? direct).push(dish);
  }
  return {
    direct,
    groups: buckets.map((b) => b.group).filter((g) => g.dishes.length),
  };
}
