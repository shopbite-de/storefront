import type { Id, Media, Money } from "../kernel";

/** How search engines see the page of a menu section (Discoverability). */
export type SectionSeo = Readonly<{
  /** Page title, if the restaurant set one; else the section's name. */
  title: string | null;
  /** Meta description, if set; else the section's description. */
  description: string | null;
  /** False for a section taken off the menu that still has its page. */
  indexable: boolean;
}>;

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
  /** Storefront path of the section, e.g. `/Speisekarte/Pizza/`; null without one. */
  path: string | null;
  seo: SectionSeo;
  /** Sub-sections in menu order. */
  children: readonly MenuSection[];
}>;

export type Diet = "vegetarian" | "vegan";

/** An allergen (code A–R) or additive (code 1–12) of a dish. */
export type FoodLabel = Readonly<{ code: string; name: string }>;

export type FoodLabels = Readonly<{
  /** In the order of the restaurant's list. */
  allergens: readonly FoodLabel[];
  additives: readonly FoodLabel[];
  /** The lists were checked and are complete; otherwise say "ask us". */
  checked: boolean;
}>;

/**
 * A main ingredient of a dish. Each one is a removable ingredient
 * ("ohne Zwiebeln"); the guest's removals name it (`name`), the id tells
 * the backend's entries apart.
 */
export type Ingredient = Readonly<{ id: Id; name: string }>;

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
  /** The former price, struck through, if the restaurant set one. */
  listPrice: Money | null;
  /** The price is a "from" price (a parent with variants). */
  priceFrom: boolean;
  media: Media | null;
  /** Main ingredients, in menu order; each one can be removed ("ohne"). */
  ingredients: readonly Ingredient[];
  diets: readonly Diet[];
  /** Kitchen badge ("Italienisch"), if any. */
  kitchen: string | null;
  foodLabels: FoodLabels;
  available: boolean;
  /** A variant has to be chosen first (a parent with variants). */
  needsChoice: boolean;
  /** Ids of the menu sections the dish is listed in directly. */
  sectionIds: readonly Id[];
  /**
   * The link of the dish (its sheet over a section, e.g.
   * `/Speisekarte/Pizza/?produkt=21`) when the backend keeps one; null
   * leaves it to the storefront, which links the dish under the section it
   * is listed in.
   */
  path: string | null;
}>;

/** A choice that tells variants apart ("Größe"), with its options. */
export type VariantGroup = Readonly<{
  id: Id;
  name: string;
  /** In the order the dish sheet offers them. */
  options: readonly Readonly<{ id: Id; name: string }>[];
}>;

/**
 * One orderable form of a dish ("Groß 40 cm"), chosen by one option per
 * variant group. Name, media and main ingredients are its own or the
 * dish's.
 */
export type Variant = Readonly<{
  id: Id;
  number: string;
  name: string;
  /** One option per variant group. */
  optionIds: readonly Id[];
  price: Money;
  listPrice: Money | null;
  available: boolean;
  media: Media | null;
  ingredients: readonly Ingredient[];
}>;

/** An optional addition to a dish ("Extra Käse"), priced on its own. */
export type Extra = Readonly<{
  id: Id;
  number: string;
  name: string;
  price: Money;
  available: boolean;
}>;

/** A named list of extras for a dish ("Extras", "Beilagen"). */
export type ExtraGroup = Readonly<{
  id: Id;
  name: string;
  extras: readonly Extra[];
}>;

/**
 * Everything the dish sheet needs to configure a dish. A variant asked for
 * by id or menu number answers its dish with that variant selected.
 */
export type DishDetail = Dish &
  Readonly<{
    variantGroups: readonly VariantGroup[];
    /** Every variant of the dish; empty for a dish without variants. */
    variants: readonly Variant[];
    /**
     * The variant the sheet starts with: the one asked for, else the
     * backend's default variant of the dish; null without variants.
     */
    selectedVariantId: Id | null;
    extraGroups: readonly ExtraGroup[];
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
  /** Key of one of `MenuListing.sortings`; else the backend's default. */
  sorting?: string;
  /**
   * Selected filter option ids: a dish matches one option of every filter
   * that has a selected option.
   */
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
  /** The sorting applied (the default one without a choice). */
  sorting: string | null;
  /** The filter option ids applied. */
  filterOptionIds: readonly Id[];
}>;
