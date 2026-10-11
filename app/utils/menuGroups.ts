import type { Schemas } from "#shopware";

/** A sub-section of a menu section with its dishes (#487). */
export interface MenuGroup {
  id: string;
  name: string;
  products: Schemas["Product"][];
}

/** The category with this id anywhere in a navigation tree. */
export function findCategory(
  tree: Schemas["Category"][] | undefined,
  id: string,
): Schemas["Category"] | undefined {
  for (const category of tree ?? []) {
    if (category.id === id) return category;
    const found = findCategory(category.children, id);
    if (found) return found;
  }
  return undefined;
}

function idsBelow(category: Schemas["Category"]): string[] {
  return [category.id, ...(category.children ?? []).flatMap(idsBelow)];
}

/**
 * Splits the dishes of a section into the ones directly in it and one group
 * per sub-section, in the order of the navigation (= backoffice order).
 * Deeper levels count to their sub-section; empty groups are left out, so a
 * filter or search shows only what matches. Without sub-sections: null.
 */
export function groupBySubsections(
  products: Schemas["Product"][],
  subsections: Schemas["Category"][] | undefined,
): { direct: Schemas["Product"][]; groups: MenuGroup[] } | null {
  if (!subsections?.length) return null;
  const buckets = subsections.map((category) => ({
    group: {
      id: category.id,
      name: category.translated?.name ?? category.name ?? "",
      products: [] as Schemas["Product"][],
    },
    ids: new Set(idsBelow(category)),
  }));
  const direct: Schemas["Product"][] = [];
  for (const product of products) {
    const bucket = buckets.find((b) =>
      (product.categoryIds ?? []).some((id) => b.ids.has(id)),
    );
    (bucket?.group.products ?? direct).push(product);
  }
  return {
    direct,
    groups: buckets.map((b) => b.group).filter((g) => g.products.length),
  };
}
