import type { Id, Media, Money } from "../kernel";

/**
 * A section of the menu ("Pizza", "Nudeln"); sections may have
 * sub-sections. German UI: "Kategorie" / section name.
 */
export type MenuSection = Readonly<{
  id: Id;
  name: string;
  description: string | null;
  /** Icon name (icones.js.org, e.g. `i-lucide-pizza`). */
  icon: string | null;
  media: Media | null;
  /** Storefront path of the section, e.g. `/Speisekarte/Pizza/`. */
  path: string;
  children: readonly MenuSection[];
}>;

export type Diet = "vegetarian" | "vegan";

/** An allergen (code A–R) or additive (code 1–12) of a dish. */
export type FoodLabel = Readonly<{ code: string; name: string }>;

export type FoodLabels = Readonly<{
  allergens: readonly FoodLabel[];
  additives: readonly FoodLabel[];
  /** The lists were checked and are complete; otherwise say "ask us". */
  checked: boolean;
}>;

/**
 * Something on the menu that can be ordered, as a menu card shows it. A
 * dish with variants is the parent: the guest has to choose a variant
 * before it goes into the cart (`needsChoice`).
 */
export type Dish = Readonly<{
  id: Id;
  /** Menu number ("Nr. 21"), shown on the card and the receipt. */
  number: string;
  name: string;
  description: string | null;
  /** Price of the dish; for a parent the lowest variant price. */
  price: Money;
  /** The price is a "from" price (variants differ). */
  priceFrom: boolean;
  media: Media | null;
  /** Main ingredients, in menu order; each one can be removed ("ohne"). */
  ingredients: readonly string[];
  diets: readonly Diet[];
  /** Kitchen badge ("Italienisch"), if any. */
  kitchen: string | null;
  available: boolean;
  /** A variant has to be chosen first (a parent with variants). */
  needsChoice: boolean;
  /** Ids of the menu sections the dish is listed in. */
  sectionIds: readonly Id[];
}>;

/** A choice that tells variants apart ("Größe"), with its options. */
export type VariantGroup = Readonly<{
  id: Id;
  name: string;
  options: readonly Readonly<{ id: Id; name: string }>[];
}>;

/** One orderable form of a dish ("Groß 40 cm"), itself a dish. */
export type Variant = Readonly<{
  id: Id;
  number: string;
  /** One option per variant group. */
  optionIds: readonly Id[];
  price: Money;
  available: boolean;
}>;

/** An optional addition to a dish ("Extra Käse"), priced on its own. */
export type Extra = Readonly<{
  id: Id;
  number: string;
  name: string;
  price: Money;
}>;

/** A named list of extras for a dish ("Extras", "Beilagen"). */
export type ExtraGroup = Readonly<{
  id: Id;
  name: string;
  extras: readonly Extra[];
}>;

/** Everything the dish sheet needs to configure a dish. */
export type DishDetail = Dish &
  Readonly<{
    variantGroups: readonly VariantGroup[];
    variants: readonly Variant[];
    extraGroups: readonly ExtraGroup[];
    foodLabels: FoodLabels;
    /** Suggested on the order confirmation step. */
    upsell: boolean;
  }>;

/** A filter of a menu listing (diet, ingredient …) with its options. */
export type ListingFilter = Readonly<{
  id: Id;
  name: string;
  options: readonly Readonly<{ id: Id; name: string }>[];
}>;

export type ListingQuery = Readonly<{
  /** 1-based. */
  page?: number;
  limit?: number;
  /** Key of one of `MenuListing.sortings`. */
  sorting?: string;
  /** Selected filter option ids (dishes must match all groups). */
  filterOptionIds?: readonly Id[];
}>;

/** One page of dishes of a section or a search. */
export type MenuListing = Readonly<{
  dishes: readonly Dish[];
  total: number;
  page: number;
  limit: number;
  filters: readonly ListingFilter[];
  sortings: readonly Readonly<{ key: string; label: string }>[];
  sorting: string | null;
}>;
