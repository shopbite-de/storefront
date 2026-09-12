import type { Schemas } from "#shopware";

const MAIN_INGREDIENTS_GROUP = "Hauptzutaten";

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
