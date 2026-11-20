import { invalidValue, type Id } from "../kernel";

/**
 * A dish as the guest configured it: the dish (the chosen variant, if any),
 * the extras and the removed ingredients. Two configurations with the same
 * parts are the same, whatever the order; the cart and the wishlist keep
 * one line per configuration. German UI: the dish sheet ("Anpassen").
 */
export type DishConfiguration = Readonly<{
  dishId: Id;
  extraIds: readonly Id[];
  /** Names of removed main ingredients ("ohne Zwiebeln"). */
  removedIngredients: readonly string[];
}>;

function normalise(list: readonly string[] = []): readonly string[] {
  return Object.freeze(
    [...new Set(list.map((entry) => entry.trim()).filter(Boolean))].sort(),
  );
}

export function dishConfiguration(input: {
  dishId: Id;
  extraIds?: readonly Id[];
  removedIngredients?: readonly string[];
}): DishConfiguration {
  const dishId = input.dishId.trim();
  if (!dishId) {
    throw invalidValue("A dish configuration needs a dish.", input.dishId);
  }
  return Object.freeze({
    dishId,
    extraIds: normalise(input.extraIds),
    removedIngredients: normalise(input.removedIngredients),
  });
}

export function isSameDishConfiguration(
  a: DishConfiguration,
  b: DishConfiguration,
): boolean {
  return (
    a.dishId === b.dishId &&
    a.extraIds.join("\n") === b.extraIds.join("\n") &&
    a.removedIngredients.join("\n") === b.removedIngredients.join("\n")
  );
}

/** No extras and nothing removed: the dish as it is on the menu. */
export function isPlainDish(configuration: DishConfiguration): boolean {
  return (
    configuration.extraIds.length === 0 &&
    configuration.removedIngredients.length === 0
  );
}
