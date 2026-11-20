import {
  deepFreeze,
  DomainError,
  type Diet,
  type Dish,
  type DishDetail,
  type ExtraGroup,
  type FoodLabels,
  type Id,
  type Ingredient,
  type ListingFilter,
  type ListingQuery,
  type Media,
  type MenuListing,
  type MenuSection,
  type Money,
  type Variant,
  type VariantGroup,
} from "../../../shared/domain";
import type { CatalogPort } from "../../ports";

/** A variant as the memory adapter keeps it; unset parts are the dish's. */
export type MemoryVariant = Readonly<{
  id: Id;
  number: string;
  optionIds: readonly Id[];
  price: Money;
  listPrice?: Money | null;
  available: boolean;
  name?: string;
  media?: Media | null;
  ingredients?: readonly Ingredient[];
}>;

/** A dish of the memory menu, with what its sheet offers. */
export type MemoryDish = Readonly<{
  id: Id;
  number: string;
  name: string;
  description: string | null;
  /** For a dish with variants the price of the dish itself. */
  price: Money;
  listPrice: Money | null;
  sectionIds: readonly Id[];
  ingredients: readonly Ingredient[];
  diets: readonly Diet[];
  kitchen: string | null;
  foodLabels: FoodLabels;
  available: boolean;
  media: Media | null;
  path: string | null;
  topSeller: boolean;
  upsell: boolean;
  variantGroups: readonly VariantGroup[];
  /** In the dish's order; the first available one is the default. */
  variants: readonly MemoryVariant[];
  extraGroups: readonly ExtraGroup[];
}>;

export type MemorySorting = Readonly<{ key: string; label: string }>;

/** The menu of the memory adapter, in domain terms. */
export type MemoryCatalog = Readonly<{
  /** The menu tree, in menu order. */
  sections: readonly MenuSection[];
  /** Sections off the menu that still have their page. */
  offMenuSections: readonly MenuSection[];
  dishes: readonly MemoryDish[];
  /** The diet filters of a listing: group and its option ("Ja"). */
  dietFilters: Readonly<
    Record<Diet, Readonly<{ id: Id; name: string; optionId: Id }>>
  >;
  sortings: readonly MemorySorting[];
  /** The listing's sorting without a choice. */
  defaultSorting: string;
  searchSortings: readonly MemorySorting[];
  defaultSearchSorting: string;
}>;

const PAGE_SIZE = 100;
const DIETS: readonly Diet[] = ["vegetarian", "vegan"];
const collator = new Intl.Collator("de", { numeric: true });

const notFound = (what: string, id: Id) =>
  new DomainError("not_found", `${what} ${id} is not on the menu.`, { id });

function walk(sections: readonly MenuSection[]): MenuSection[] {
  return sections.flatMap((section) => [section, ...walk(section.children)]);
}

/** Lowest variant price, else the dish's own. */
function fromPrice(dish: MemoryDish): Money {
  return dish.variants.reduce(
    (lowest, variant) =>
      variant.price.amountMinor < lowest.amountMinor ? variant.price : lowest,
    dish.variants[0]?.price ?? dish.price,
  );
}

function toDish(dish: MemoryDish): Dish {
  const hasVariants = dish.variants.length > 0;
  return {
    id: dish.id,
    number: dish.number,
    name: dish.name,
    description: dish.description,
    price: hasVariants ? fromPrice(dish) : dish.price,
    listPrice: dish.listPrice,
    priceFrom: hasVariants,
    media: dish.media,
    ingredients: dish.ingredients,
    diets: dish.diets,
    kitchen: dish.kitchen,
    foodLabels: dish.foodLabels,
    available: dish.available,
    needsChoice: hasVariants,
    sectionIds: dish.sectionIds,
    path: dish.path,
  };
}

function toVariant(dish: MemoryDish, variant: MemoryVariant): Variant {
  return {
    id: variant.id,
    number: variant.number,
    name: variant.name ?? dish.name,
    optionIds: variant.optionIds,
    price: variant.price,
    listPrice: variant.listPrice ?? null,
    available: variant.available,
    media: variant.media === undefined ? dish.media : variant.media,
    ingredients: variant.ingredients ?? dish.ingredients,
  };
}

/** A variant on its own, e.g. as an upsell dish (one click, no choice). */
function variantAsDish(dish: MemoryDish, variant: MemoryVariant): Dish {
  const form = toVariant(dish, variant);
  return {
    ...toDish(dish),
    id: form.id,
    number: form.number,
    name: form.name,
    price: form.price,
    listPrice: form.listPrice,
    priceFrom: false,
    media: form.media,
    ingredients: form.ingredients,
    available: form.available,
    needsChoice: false,
    path: null,
  };
}

function defaultVariant(dish: MemoryDish): MemoryVariant | undefined {
  return dish.variants.find((variant) => variant.available) ?? dish.variants[0];
}

function toDetail(dish: MemoryDish, selected?: MemoryVariant): DishDetail {
  return {
    ...toDish(dish),
    variantGroups: dish.variantGroups,
    variants: dish.variants.map((variant) => toVariant(dish, variant)),
    selectedVariantId: (selected ?? defaultVariant(dish))?.id ?? null,
    extraGroups: dish.extraGroups,
    upsell: dish.upsell,
  };
}

/** A word-for-word match of the text in name or menu number. */
function matches(dish: MemoryDish, text: string): boolean {
  const words = text.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  const name = dish.name.toLocaleLowerCase("de");
  return (
    words.length > 0 &&
    words.every(
      (word) =>
        name.includes(word) || dish.number.toLocaleLowerCase("de") === word,
    )
  );
}

const COMPARATORS: Readonly<
  Record<string, (a: MemoryDish, b: MemoryDish) => number>
> = {
  "name-asc": (a, b) => collator.compare(a.name, b.name),
  "name-desc": (a, b) => collator.compare(b.name, a.name),
  "price-asc": (a, b) => fromPrice(a).amountMinor - fromPrice(b).amountMinor,
  "price-desc": (a, b) => fromPrice(b).amountMinor - fromPrice(a).amountMinor,
  topseller: (a, b) =>
    Number(b.topSeller) - Number(a.topSeller) ||
    collator.compare(a.name, b.name),
};

/**
 * CatalogPort over a fixed menu in memory: listings sort, filter by diet
 * and page like a shop backend; nothing changes at runtime.
 */
export function createMemoryCatalog(seed: MemoryCatalog): CatalogPort {
  const menu = deepFreeze(structuredClone(seed));
  const sections = [...walk(menu.sections), ...walk(menu.offMenuSections)];
  const findSection = (id: Id) => sections.find((section) => section.id === id);
  const dishOf = (id: Id) =>
    menu.dishes.find(
      (dish) => dish.id === id || dish.variants.some((v) => v.id === id),
    );

  function filtersOf(dishes: readonly MemoryDish[]): ListingFilter[] {
    return DIETS.filter((diet) =>
      dishes.some((dish) => dish.diets.includes(diet)),
    ).map((diet) => {
      const filter = menu.dietFilters[diet];
      return {
        id: filter.id,
        name: filter.name,
        options: [{ id: filter.optionId, name: "Ja" }],
      };
    });
  }

  function listing(
    candidates: readonly MemoryDish[],
    query: ListingQuery,
    sortings: readonly MemorySorting[],
    fallback: string,
    score: (dish: MemoryDish) => number = () => 0,
  ): MenuListing {
    const sorting = query.sorting ?? fallback;
    if (!sortings.some((offered) => offered.key === sorting)) {
      throw new DomainError(
        "invalid_value",
        `The listing does not offer the sorting ${sorting}.`,
        { sorting },
      );
    }
    const selected = [...new Set(query.filterOptionIds ?? [])];
    const chosen = DIETS.filter((diet) =>
      selected.includes(menu.dietFilters[diet].optionId),
    );
    const compare =
      COMPARATORS[sorting] ??
      ((a: MemoryDish, b: MemoryDish) =>
        score(b) - score(a) || collator.compare(a.name, b.name));
    const found = candidates
      .filter((dish) => chosen.every((diet) => dish.diets.includes(diet)))
      .sort(compare);
    const page = query.page ?? 1;
    return deepFreeze({
      dishes: found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(toDish),
      total: found.length,
      page,
      limit: PAGE_SIZE,
      filters: filtersOf(candidates),
      sortings: [...sortings],
      sorting,
      filterOptionIds: selected,
    });
  }

  const emptyListing = (): MenuListing =>
    deepFreeze({
      dishes: [],
      total: 0,
      page: 1,
      limit: PAGE_SIZE,
      filters: [],
      sortings: [],
      sorting: null,
      filterOptionIds: [],
    });

  return {
    getMenu: async () => menu.sections,
    getSection: async (sectionId) => {
      const section = findSection(sectionId);
      if (!section) throw notFound("Section", sectionId);
      return section;
    },
    listDishes: async (sectionId, query = {}) => {
      const section = findSection(sectionId);
      if (!section) throw notFound("Section", sectionId);
      const ids = new Set(walk([section]).map((entry) => entry.id));
      return listing(
        menu.dishes.filter((dish) => dish.sectionIds.some((id) => ids.has(id))),
        query,
        menu.sortings,
        menu.defaultSorting,
      );
    },
    searchDishes: async (text, query = {}) => {
      if (!text.trim()) return emptyListing();
      return listing(
        menu.dishes.filter((dish) => matches(dish, text)),
        query,
        menu.searchSortings,
        menu.defaultSearchSorting,
      );
    },
    listMenuDishes: async () =>
      deepFreeze(
        menu.dishes.filter((dish) => dish.sectionIds.length > 0).map(toDish),
      ),
    getDish: async (dishId) => {
      const dish = dishOf(dishId);
      if (!dish) throw notFound("Dish", dishId);
      return deepFreeze(
        toDetail(
          dish,
          dish.variants.find((variant) => variant.id === dishId),
        ),
      );
    },
    findDishByNumber: async (number) => {
      const dish = menu.dishes.find(
        (candidate) =>
          candidate.number === number ||
          candidate.variants.some((variant) => variant.number === number),
      );
      if (!dish) return null;
      return deepFreeze(
        toDetail(
          dish,
          dish.variants.find((variant) => variant.number === number),
        ),
      );
    },
    findVariant: async (dishId, optionIds) => {
      const dish = menu.dishes.find((candidate) => candidate.id === dishId);
      const variant = optionIds.length
        ? dish?.variants.find((candidate) =>
            optionIds.every((id) => candidate.optionIds.includes(id)),
          )
        : undefined;
      return dish && variant ? deepFreeze(toVariant(dish, variant)) : null;
    },
    listTopSellers: async (limit) =>
      deepFreeze(
        menu.dishes
          .filter((dish) => dish.topSeller)
          .slice(0, limit)
          .map(toDish),
      ),
    listUpsellDishes: async (limit) =>
      deepFreeze(
        menu.dishes
          .filter((dish) => dish.upsell)
          .flatMap((dish) =>
            dish.variants.length
              ? dish.variants.map((variant) => variantAsDish(dish, variant))
              : [toDish(dish)],
          )
          .sort((a, b) => collator.compare(a.name, b.name))
          .slice(0, limit),
      ),
  };
}
