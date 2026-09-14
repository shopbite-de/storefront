import type { Schemas } from "#shopware";

const MAIN_INGREDIENTS_GROUP = "Hauptzutaten";

/** `available` is optional in the projection; missing means orderable. */
export function productIsAvailable(product: Schemas["Product"]): boolean {
  return product.available !== false;
}

/**
 * Whether a cart line item holds the product, as a plain line item or as a
 * container item carrying extras (the product is the first child, #325).
 */
export function lineItemHoldsProduct(
  item: Schemas["LineItem"],
  productId: string,
): boolean {
  return (
    item.referencedId === productId ||
    (item.children ?? []).some((child) => child.referencedId === productId)
  );
}

export function getMainIngredients(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
): Schemas["PropertyGroupOption"][] {
  const group = sortedProperties?.find(
    (propertyGroup) => propertyGroup.translated.name === MAIN_INGREDIENTS_GROUP,
  );
  return group?.options ?? [];
}
