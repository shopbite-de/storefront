import type {
  DishConfiguration,
  DishDetail,
  WishlistEntry,
} from "../../shared/domain";

/**
 * The wishlist in the browser (ADR 0001, step 7): a guest's entries are
 * the domain's `WishlistEntry` values in local storage (they outlive the
 * session); a customer's come from the BFF. Pure helpers, no value import
 * of `shared/` (Layer imports).
 */

/** What the dish sheet saves: the configuration and its menu number. */
export type WishlistSelection = Readonly<{
  configuration: DishConfiguration;
  dishNumber: string;
}>;

/**
 * An entry of the guest wishlist of 2.x (#467): the ordered product, the
 * removed ingredients by name, the extras by menu number.
 */
export type LegacyWishlistEntry = Readonly<{
  id: string;
  productId: string;
  productNumber: string;
  without: readonly string[];
  extras: readonly string[];
  createdAt: string;
}>;

const sameSet = (a: readonly string[], b: readonly string[]) =>
  [...new Set(a)].sort().join("\n") === [...new Set(b)].sort().join("\n");

/** Two configurations with the same parts are the same, in any order. */
export function sameConfiguration(
  a: DishConfiguration,
  b: DishConfiguration,
): boolean {
  return (
    a.dishId === b.dishId &&
    (a.variantId ?? null) === (b.variantId ?? null) &&
    sameSet(a.extraIds, b.extraIds) &&
    sameSet(a.removedIngredientIds, b.removedIngredientIds)
  );
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

export function isWishlistEntry(value: unknown): value is WishlistEntry {
  const entry = value as Partial<WishlistEntry> | null;
  const configuration = entry?.configuration as
    Partial<DishConfiguration> | undefined;
  return (
    !!entry &&
    typeof entry.id === "string" &&
    typeof entry.dishNumber === "string" &&
    typeof entry.addedAt === "string" &&
    !!configuration &&
    typeof configuration.dishId === "string" &&
    (configuration.variantId === null ||
      typeof configuration.variantId === "string") &&
    isStringList(configuration.extraIds) &&
    isStringList(configuration.removedIngredientIds)
  );
}

export function isLegacyWishlistEntry(
  value: unknown,
): value is LegacyWishlistEntry {
  const entry = value as Partial<LegacyWishlistEntry> | null;
  return (
    !!entry &&
    typeof entry.id === "string" &&
    typeof entry.productId === "string" &&
    isStringList(entry.without) &&
    isStringList(entry.extras)
  );
}

/** A new guest entry. */
export function newWishlistEntry(selection: WishlistSelection): WishlistEntry {
  const unique = (list: readonly string[]) => [
    ...new Set(list.map((entry) => entry.trim()).filter(Boolean)),
  ];
  return {
    id: crypto.randomUUID().replaceAll("-", ""),
    configuration: {
      dishId: selection.configuration.dishId,
      variantId: selection.configuration.variantId ?? null,
      extraIds: unique(selection.configuration.extraIds),
      removedIngredientIds: unique(
        selection.configuration.removedIngredientIds,
      ),
    },
    dishNumber: selection.dishNumber,
    addedAt: new Date().toISOString(),
  };
}

/**
 * A 2.x entry as a domain entry, with the dish sheet of its product (the
 * dish, or the dish of the variant it names). Names and numbers the dish
 * no longer has are left out, as the wishlist page did; null when the
 * sheet is not the product's.
 */
export function fromLegacyEntry(
  legacy: LegacyWishlistEntry,
  detail: DishDetail,
): WishlistEntry | null {
  const variant =
    detail.id === legacy.productId
      ? undefined
      : detail.variants.find((entry) => entry.id === legacy.productId);
  if (detail.id !== legacy.productId && !variant) return null;
  const ingredients = (variant ?? detail).ingredients;
  const extras = detail.extraGroups.flatMap((group) => group.extras);
  return {
    id: legacy.id,
    configuration: {
      dishId: detail.id,
      variantId: variant?.id ?? null,
      extraIds: legacy.extras.flatMap((number) => {
        const extra = extras.find((candidate) => candidate.number === number);
        return extra ? [extra.id] : [];
      }),
      removedIngredientIds: legacy.without.flatMap((name) => {
        const ingredient = ingredients.find(
          (candidate) => candidate.name === name,
        );
        return ingredient ? [ingredient.id] : [];
      }),
    },
    dishNumber: (variant ?? detail).number,
    addedAt: legacy.createdAt || new Date().toISOString(),
  };
}
