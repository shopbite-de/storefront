import type {
  CartLine,
  Diet,
  Dish,
  DishDetail,
  FoodLabels,
  Variant,
} from "../../shared/domain";

/**
 * Presentation of the menu's domain types (ADR 0001): what the cards, the
 * dish sheet and the wishlist show of a dish. Type imports only from
 * shared/ (a value import broke the server bundle of shops in 2.0.1).
 */

const DIET_LABELS: Readonly<Record<Diet, string>> = {
  vegetarian: "Vegetarisch",
  vegan: "Vegan",
};

/** The diet badges of a dish ("Vegetarisch", "Vegan"). */
export function dietLabels(diets: readonly Diet[]): string[] {
  return diets.map((diet) => DIET_LABELS[diet]);
}

/** Plain text for the info popover of the dish sheet (#500). */
export function foodLabelText(labels: FoodLabels): string {
  const parts: string[] = [];
  if (labels.allergens.length) {
    parts.push(
      `Enthält: ${labels.allergens.map((label) => label.name).join(", ")}.`,
    );
  }
  if (labels.additives.length) {
    parts.push(
      `Zusatzstoffe: ${labels.additives.map((label) => label.name).join(", ")}.`,
    );
  }
  return parts.join(" ");
}

/**
 * What goes into the cart: a dish without variants or one variant, with
 * the parts the cart line and its label need.
 */
export type OrderableDish = Pick<
  Dish,
  "id" | "number" | "name" | "price" | "available" | "ingredients"
>;

export function selectedVariant(detail: DishDetail): Variant | undefined {
  return detail.variants.find(
    (variant) => variant.id === detail.selectedVariantId,
  );
}

/** The selected variant of a dish with variants, else the dish itself. */
export function orderableOf(detail: DishDetail): OrderableDish {
  return selectedVariant(detail) ?? detail;
}

/**
 * A variant as a dish of its own: what a deep link to a variant's number
 * or a wishlist entry of a variant shows (number and price of the
 * variant, the rest of the dish).
 */
export function variantAsDish(detail: DishDetail, variant: Variant): Dish {
  return {
    id: variant.id,
    number: variant.number,
    name: variant.name,
    description: detail.description,
    price: variant.price,
    listPrice: variant.listPrice,
    priceFrom: false,
    media: variant.media,
    ingredients: variant.ingredients,
    diets: detail.diets,
    kitchen: detail.kitchen,
    foodLabels: detail.foodLabels,
    available: variant.available,
    needsChoice: false,
    sectionIds: detail.sectionIds,
    path: null,
  };
}

/** The dish a menu number names: the dish, or its variant of that number. */
export function dishForNumber(detail: DishDetail, number: string): Dish {
  const variant = detail.variants.find(
    (candidate) => candidate.number === number,
  );
  return variant ? variantAsDish(detail, variant) : detail;
}

/**
 * Whether a cart line holds the dish (or variant): as what it orders, or
 * as one of its extras (#325).
 */
export function cartLineHoldsDish(line: CartLine, dishId: string): boolean {
  const { configuration } = line;
  return (
    (configuration.variantId ?? configuration.dishId) === dishId ||
    configuration.extraIds.includes(dishId)
  );
}

/**
 * A cart or order line as the receipt names it: `Name +Extra -Zutat`.
 */
export function cartLineLabel(
  line: Pick<CartLine, "name" | "removedIngredients"> & {
    extras: readonly Readonly<{ name: string }>[];
  },
): string {
  return [
    line.name,
    ...line.extras.map((extra) => `+${extra.name}`),
    ...line.removedIngredients.map((name) => `-${name}`),
  ].join(" ");
}
