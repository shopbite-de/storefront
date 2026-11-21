import { invalidValue, type Id } from "../kernel";

/**
 * A dish as the guest configured it: the dish, the chosen variant, the
 * extras and the removed main ingredients (by id). Two configurations with
 * the same parts are the same, whatever the order; the cart and the
 * wishlist keep one line per configuration. The order the guest chose is
 * kept (the receipt lists extras and removals in it). German UI: the dish
 * sheet ("Anpassen").
 */
export type DishConfiguration = Readonly<{
  /** The dish on the menu. */
  dishId: Id;
  /** The chosen variant of the dish; null for a dish without variants. */
  variantId: Id | null;
  extraIds: readonly Id[];
  /** Removed main ingredients ("ohne Zwiebeln"). */
  removedIngredientIds: readonly Id[];
}>;

function normalise(list: readonly string[] = []): readonly string[] {
  return Object.freeze([
    ...new Set(list.map((entry) => entry.trim()).filter(Boolean)),
  ]);
}

export function dishConfiguration(input: {
  dishId: Id;
  variantId?: Id | null;
  extraIds?: readonly Id[];
  removedIngredientIds?: readonly Id[];
}): DishConfiguration {
  const dishId = input.dishId.trim();
  if (!dishId) {
    throw invalidValue("A dish configuration needs a dish.", input.dishId);
  }
  return Object.freeze({
    dishId,
    variantId: input.variantId?.trim() || null,
    extraIds: normalise(input.extraIds),
    removedIngredientIds: normalise(input.removedIngredientIds),
  });
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length &&
  [...a].sort().join("\n") === [...b].sort().join("\n");

export function isSameDishConfiguration(
  a: DishConfiguration,
  b: DishConfiguration,
): boolean {
  return (
    a.dishId === b.dishId &&
    a.variantId === b.variantId &&
    sameSet(a.extraIds, b.extraIds) &&
    sameSet(a.removedIngredientIds, b.removedIngredientIds)
  );
}

/** No extras and nothing removed: the dish as it is on the menu. */
export function isPlainDish(configuration: DishConfiguration): boolean {
  return (
    configuration.extraIds.length === 0 &&
    configuration.removedIngredientIds.length === 0
  );
}

/** What the kitchen makes: the chosen variant, else the dish. */
export function orderedDishId(configuration: DishConfiguration): Id {
  return configuration.variantId ?? configuration.dishId;
}
