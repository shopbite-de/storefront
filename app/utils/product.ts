import type { Schemas } from "#shopware";

const MAIN_INGREDIENTS_GROUP = "Hauptzutaten";

// Property groups whose option "Ja" marks the diet of a product.
const DIET_GROUPS = { vegetarian: "Vegetarisch", vegan: "Vegan" } as const;

export type Diet = keyof typeof DIET_GROUPS;

/** `available` is optional in the projection; missing means orderable. */
export function productIsAvailable(product: Schemas["Product"]): boolean {
  return product.available !== false;
}

/**
 * Whether the product needs a choice before it can go into the cart: a
 * parent with variants (#441). Extras and deselected ingredients are
 * optional, so a product without variants can be added from the menu.
 */
export function productNeedsChoice(product: Schemas["Product"]): boolean {
  return (product.childCount ?? 0) > 0;
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

/** Whether the product has the option "Ja" in the given property group. */
export function hasYesOption(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
  groupName: string,
): boolean {
  return (
    sortedProperties?.some(
      (group) =>
        group.translated.name === groupName &&
        group.options?.some((option) => option.translated.name === "Ja"),
    ) ?? false
  );
}

/** Diets marked on the product via the `Vegetarisch`/`Vegan` groups. */
export function getDiets(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
): Diet[] {
  return (Object.keys(DIET_GROUPS) as Diet[]).filter((diet) =>
    hasYesOption(sortedProperties, DIET_GROUPS[diet]),
  );
}

// Mandatory food information (#485): property groups and custom fields of the
// ShopBite plugin (shopware-plugin#36), maintained in the backoffice.
const ALLERGEN_GROUP = "Allergene";
const ADDITIVE_GROUP = "Zusatzstoffe";

/**
 * Names of the allergen codes for the legend. The options name the cereal
 * or nut (LMIV Annex II), the legend names the allergen.
 */
export const ALLERGEN_CODE_NAMES: Record<string, string> = {
  A: "Glutenhaltiges Getreide",
  B: "Krebstiere",
  C: "Eier",
  D: "Fisch",
  E: "Erdnüsse",
  F: "Soja",
  G: "Milch",
  H: "Schalenfrüchte",
  L: "Sellerie",
  M: "Senf",
  N: "Sesam",
  O: "Schwefeldioxid und Sulfite",
  P: "Lupinen",
  R: "Weichtiere",
};

export interface FoodLabel {
  code: string;
  name: string;
}

export interface FoodLabels {
  allergens: FoodLabel[];
  additives: FoodLabel[];
}

function customFieldsOf(entity: {
  customFields?: unknown;
  translated?: unknown;
}): Record<string, unknown> {
  const translated = (entity.translated as { customFields?: unknown })
    ?.customFields;
  return ((translated ?? entity.customFields) as Record<string, unknown>) ?? {};
}

function labelsOf(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
  groupName: string,
): FoodLabel[] {
  const group = sortedProperties?.find(
    (propertyGroup) => propertyGroup.translated.name === groupName,
  );
  return (group?.options ?? []).map((option) => ({
    code: String(customFieldsOf(option).shopbite_code ?? ""),
    name: option.translated?.name ?? option.name ?? "",
  }));
}

/** Allergens and additives of a product, in the order of the catalogue. */
export function getFoodLabels(
  sortedProperties: Schemas["PropertyGroup"][] | undefined,
): FoodLabels {
  return {
    allergens: labelsOf(sortedProperties, ALLERGEN_GROUP),
    additives: labelsOf(sortedProperties, ADDITIVE_GROUP),
  };
}

/**
 * Whether the restaurant confirmed the lists as complete. Without it an
 * empty list means "not entered yet", never "free of allergens".
 */
export function allergensChecked(product: Schemas["Product"]): boolean {
  return customFieldsOf(product).shopbite_allergens_checked === true;
}

/** "A, G, 2": every code once, allergens first. */
export function foodLabelCodes(labels: FoodLabels): string[] {
  return [
    ...new Set(
      [...labels.allergens, ...labels.additives]
        .map((label) => label.code)
        .filter(Boolean),
    ),
  ];
}

/** Plain text for the product sheet and screen readers. */
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
 * Legend of the codes used in a list of products: allergens by their
 * allergen name, additives by their option name, sorted like a menu.
 */
export function foodLabelLegend(products: Schemas["Product"][]): FoodLabel[] {
  const legend = new Map<string, string>();
  for (const product of products) {
    const labels = getFoodLabels(
      product.sortedProperties as Schemas["PropertyGroup"][] | undefined,
    );
    for (const label of labels.allergens) {
      if (label.code)
        legend.set(label.code, ALLERGEN_CODE_NAMES[label.code] ?? label.name);
    }
    for (const label of labels.additives) {
      if (label.code) legend.set(label.code, label.name);
    }
  }
  return [...legend]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => {
      const numeric = Number(a.code) - Number(b.code);
      if (!Number.isNaN(numeric)) return numeric;
      if (Number.isNaN(Number(a.code)) !== Number.isNaN(Number(b.code)))
        return Number.isNaN(Number(a.code)) ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
}
