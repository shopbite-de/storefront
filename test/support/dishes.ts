import type { Dish, DishDetail, Money, Variant } from "../../shared/domain";

/**
 * Dishes in domain terms for app tests (the BFF's answers). Literal
 * values: app code imports nothing but types from shared/.
 */
export const eur = (amountMinor: number): Money => ({
  amountMinor,
  currency: "EUR",
});

export function dish(fields: Partial<Dish> = {}): Dish {
  return {
    id: "d21",
    number: "21",
    name: "Pizza Margherita",
    description: "Mit Tomatensoße und Käse",
    price: eur(700),
    listPrice: null,
    priceFrom: false,
    media: null,
    ingredients: [
      { id: "i1", name: "Tomatensoße" },
      { id: "i2", name: "Käse" },
    ],
    diets: ["vegetarian"],
    kitchen: null,
    foodLabels: { allergens: [], additives: [], checked: false },
    available: true,
    needsChoice: false,
    sectionIds: ["pizza"],
    path: null,
    ...fields,
  };
}

export function variant(fields: Partial<Variant> = {}): Variant {
  return {
    id: "v21-gross",
    number: "21-groß",
    name: "Pizza Margherita",
    optionIds: ["gross"],
    price: eur(1000),
    listPrice: null,
    available: true,
    media: null,
    ingredients: [
      { id: "i1", name: "Tomatensoße" },
      { id: "i2", name: "Käse" },
    ],
    ...fields,
  };
}

export function dishDetail(fields: Partial<DishDetail> = {}): DishDetail {
  return {
    ...dish(),
    variantGroups: [],
    variants: [],
    selectedVariantId: null,
    extraGroups: [],
    upsell: false,
    ...fields,
  };
}

/** Pizza Margherita with two sizes and extras, "Normal" selected. */
export function pizzaWithSizes(fields: Partial<DishDetail> = {}): DishDetail {
  return dishDetail({
    priceFrom: true,
    needsChoice: true,
    variantGroups: [
      {
        id: "groesse",
        name: "Größe",
        options: [
          { id: "normal", name: "Normal 30 cm" },
          { id: "gross", name: "Groß 40 cm" },
        ],
      },
    ],
    variants: [
      variant({
        id: "v21-normal",
        number: "21-normal",
        optionIds: ["normal"],
        price: eur(700),
      }),
      variant(),
    ],
    selectedVariantId: "v21-normal",
    extraGroups: [
      {
        id: "extras",
        name: "Extras",
        extras: [
          {
            id: "x900",
            number: "900",
            name: "Extra Käse",
            price: eur(100),
            available: true,
          },
          {
            id: "x901",
            number: "901",
            name: "Extra Salami",
            price: eur(150),
            available: true,
          },
        ],
      },
    ],
    ...fields,
  });
}
