import type { Schemas } from "#shopware";

const MAIN_INGREDIENTS_GROUP = "Hauptzutaten";

/**
 * True when the product needs a choice before it can go into the cart:
 * variants (child products) or extras (an active cross-selling). The
 * listing endpoints include `childCount` and `crossSellings` for this (#325).
 */
export function productHasOptions(product: Schemas["Product"]): boolean {
  if ((product.childCount ?? 0) > 0) return true;
  return (product.crossSellings ?? []).some(
    (crossSelling) => crossSelling.active !== false,
  );
}

/** `available` is optional in the projection; missing means orderable. */
export function productIsAvailable(product: Schemas["Product"]): boolean {
  return product.available !== false;
}

export function getMainIngredients(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
): Schemas["PropertyGroupOption"][] {
  const group = sortedProperties?.find(
    (propertyGroup) => propertyGroup.translated.name === MAIN_INGREDIENTS_GROUP,
  );
  return group?.options ?? [];
}
