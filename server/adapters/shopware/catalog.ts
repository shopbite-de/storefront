import {
  deepFreeze,
  DomainError,
  isDomainError,
  moneyFromDecimal,
  type CurrencyCode,
  type Diet,
  type Dish,
  type DishDetail,
  type ExtraGroup,
  type FoodLabel,
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
import { menuRootReader } from "./menuRoot";
import { errorCodes, request } from "./request";
import { text, type AdapterLog } from "./shop";
import type { StoreApi } from "./storeApi";

/*
 * What the adapter reads of the Store API answers: the fields the criteria
 * below ask for, all optional (Shopware leaves out what is empty).
 */
export type Translated<T> = T & { translated?: Partial<T> | null };
type CustomFields = Record<string, unknown>;

type SwMedia = {
  url?: string | null;
  alt?: string | null;
  translated?: { alt?: string | null } | null;
  metaData?: { width?: number; height?: number } | null;
  thumbnails?: { url?: string; width?: number }[] | null;
};
type SwOption = Translated<{
  id: string;
  name?: string | null;
  customFields?: CustomFields | null;
}>;
type SwGroup = Translated<{
  id: string;
  name?: string | null;
  options?: SwOption[] | null;
}>;
type SwPrice = {
  unitPrice?: number;
  totalPrice?: number;
  listPrice?: { price?: number } | null;
};
type SwSeoUrl = { seoPathInfo?: string; isCanonical?: boolean | null };
export type SwProduct = Translated<{
  id: string;
  parentId?: string | null;
  productNumber: string;
  name?: string | null;
  description?: string | null;
  customFields?: CustomFields | null;
}> & {
  childCount?: number | null;
  available?: boolean;
  calculatedPrice?: SwPrice;
  calculatedCheapestPrice?: SwPrice | null;
  cover?: { media?: SwMedia | null } | null;
  sortedProperties?: SwGroup[] | null;
  optionIds?: string[] | null;
  categoryIds?: string[] | null;
  seoUrls?: SwSeoUrl[] | null;
};
type SwCategory = Translated<{
  id: string;
  name?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  customFields?: CustomFields | null;
}> & {
  type?: string;
  active?: boolean;
  seoUrl?: string | null;
  media?: SwMedia | null;
  children?: SwCategory[] | null;
};
type SwSorting = Translated<{ key: string; label?: string }>;
type SwListing = {
  elements?: SwProduct[];
  total?: number;
  page?: number;
  limit?: number;
  sorting?: string | null;
  availableSortings?: SwSorting[];
  currentFilters?: { properties?: string[] | null } | null;
  aggregations?: { properties?: { entities?: SwGroup[] } } | null;
};
type SwCrossSelling = {
  crossSelling?: Translated<{ id: string; name?: string | null }>;
  products?: SwProduct[];
};

// Property groups and custom fields of the ShopBite conventions
// (CLAUDE.md, product data model).
const MAIN_INGREDIENTS = "Hauptzutaten";
const KITCHEN = "Küche";
const ALLERGENS = "Allergene";
const ADDITIVES = "Zusatzstoffe";
const DIET_GROUPS: Readonly<Record<Diet, string>> = {
  vegetarian: "Vegetarisch",
  vegan: "Vegan",
};
const YES = "Ja";
const CODE_FIELD = "shopbite_code";
const CHECKED_FIELD = "shopbite_allergens_checked";
const UPSELL_FIELD = "shopbite_cart_upsell";
const ICON_FIELD = "shopbite_category_icon";
/** The query parameter of the dish sheet in a dish's link. */
const SHEET_PARAM = "produkt";

/** Store API maximum per request; no menu section has more. */
const PAGE_SIZE = 100;
const MAX_MENU_PAGES = 10;

const MEDIA = {
  media: ["url", "alt", "translated", "thumbnails", "metaData"],
  media_thumbnail: ["url", "width", "height"],
  product_media: ["media"],
};
const PROPERTY_INCLUDES = {
  // the entity is `property_group`: under `property` the groups came back
  // with every field, nested once more in each option
  property_group: ["id", "name", "translated", "options"],
  // custom fields only come back when listed (`translated` too)
  property_group_option: ["id", "name", "translated", "customFields"],
};
/** What a menu card needs of a product (dish or variant). */
const DISH_FIELDS = [
  "id",
  "parentId",
  "productNumber",
  "name",
  "description",
  "translated",
  "customFields",
  "calculatedPrice",
  "calculatedCheapestPrice",
  "available",
  "childCount",
  "cover",
  // grouped properties (ingredients, diets, kitchen, food labels);
  // `properties` would repeat every option with its group
  "sortedProperties",
  "optionIds",
  "categoryIds",
  "seoUrls",
];
const DISH_CRITERIA = {
  includes: {
    product: DISH_FIELDS,
    calculated_price: ["unitPrice", "totalPrice", "listPrice"],
    calculated_cheapest_price: ["unitPrice", "totalPrice"],
    cart_list_price: ["price"],
    seo_url: ["seoPathInfo", "isCanonical"],
    ...PROPERTY_INCLUDES,
    ...MEDIA,
  },
  associations: {
    cover: { associations: { media: {} } },
    properties: { associations: { group: {} } },
  },
};
/** The dish's link is its SEO URL; variants inherit name, cover, properties. */
const DISH_HEADERS = {
  "sw-include-seo-urls": "true",
  "sw-inheritance": "true",
};
const CATEGORY_FIELDS = [
  "id",
  "name",
  "description",
  "metaTitle",
  "metaDescription",
  "translated",
  "customFields",
  "active",
  "type",
  "seoUrl",
  "media",
  "children",
];
const CATEGORY_INCLUDES = { category: CATEGORY_FIELDS, ...MEDIA };

/** Shopware's answer to a listing page after the last one. */
const PAGE_OUT_OF_RANGE = "PRODUCT__LISTING_PAGE_OUT_OF_RANGE";

export function translated<T extends object, K extends keyof T>(
  entity: Translated<T> | null | undefined,
  key: K,
): T[K] | undefined {
  return (entity?.translated?.[key] ?? entity?.[key]) as T[K] | undefined;
}

const customField = (
  entity: Translated<{ customFields?: CustomFields | null }> | null | undefined,
  name: string,
): unknown => translated(entity, "customFields")?.[name];

const nameOf = (entity: Translated<{ name?: string | null }>) =>
  translated(entity, "name") ?? "";

export function toMedia(media: SwMedia | null | undefined): Media | null {
  if (!media?.url) return null;
  return {
    url: media.url,
    alt: text(media.translated?.alt ?? media.alt),
    width: media.metaData?.width ?? null,
    height: media.metaData?.height ?? null,
    sources: (media.thumbnails ?? []).flatMap((thumbnail) =>
      thumbnail.url && thumbnail.width
        ? [{ url: thumbnail.url, width: thumbnail.width }]
        : [],
    ),
  };
}

const groupNamed = (product: SwProduct, name: string) =>
  product.sortedProperties?.find((group) => nameOf(group) === name);

const optionsOf = (product: SwProduct, groupName: string) =>
  groupNamed(product, groupName)?.options ?? [];

export function toIngredients(product: SwProduct): Ingredient[] {
  return optionsOf(product, MAIN_INGREDIENTS).map((option) => ({
    id: option.id,
    name: nameOf(option),
  }));
}

export function toDiets(product: SwProduct): Diet[] {
  return (Object.keys(DIET_GROUPS) as Diet[]).filter((diet) =>
    optionsOf(product, DIET_GROUPS[diet]).some(
      (option) => nameOf(option) === YES,
    ),
  );
}

function labelsOf(product: SwProduct, groupName: string): FoodLabel[] {
  return optionsOf(product, groupName).map((option) => ({
    code: String(customField(option, CODE_FIELD) ?? ""),
    name: nameOf(option),
  }));
}

export function toFoodLabels(product: SwProduct): FoodLabels {
  return {
    allergens: labelsOf(product, ALLERGENS),
    additives: labelsOf(product, ADDITIVES),
    checked: customField(product, CHECKED_FIELD) === true,
  };
}

/**
 * The dish's link: its SEO URL when that opens the dish sheet over a
 * section (the ShopBite plugin's template, `…/?produkt=21`); otherwise
 * null and the storefront links the dish under its section.
 */
export function toDishPath(product: SwProduct): string | null {
  const seoUrls = product.seoUrls ?? [];
  const seoPath = (seoUrls.find((url) => url.isCanonical) ?? seoUrls[0])
    ?.seoPathInfo;
  if (!seoPath) return null;
  const query = seoPath.split("?")[1];
  if (
    query === undefined ||
    new URLSearchParams(query).get(SHEET_PARAM) === null
  ) {
    return null;
  }
  return seoPath.startsWith("/") ? seoPath : `/${seoPath}`;
}

function priceOf(
  price: SwPrice | null | undefined,
  currency: CurrencyCode,
): Money {
  return moneyFromDecimal(price?.unitPrice ?? price?.totalPrice ?? 0, currency);
}

function listPriceOf(
  price: SwPrice | null | undefined,
  currency: CurrencyCode,
): Money | null {
  const listPrice = price?.listPrice?.price;
  return typeof listPrice === "number"
    ? moneyFromDecimal(listPrice, currency)
    : null;
}

/** A product as a menu card shows it. */
export function toDish(product: SwProduct, currency: CurrencyCode): Dish {
  const needsChoice = (product.childCount ?? 0) > 0;
  const kitchen = optionsOf(product, KITCHEN)[0];
  return {
    id: product.id,
    number: product.productNumber,
    name: nameOf(product),
    description: text(translated(product, "description")),
    // a parent with variants: the lowest price of its variants
    price: priceOf(
      needsChoice
        ? (product.calculatedCheapestPrice ?? product.calculatedPrice)
        : product.calculatedPrice,
      currency,
    ),
    listPrice: listPriceOf(product.calculatedPrice, currency),
    priceFrom: needsChoice,
    media: toMedia(product.cover?.media),
    ingredients: toIngredients(product),
    diets: toDiets(product),
    kitchen: kitchen ? text(nameOf(kitchen)) : null,
    foodLabels: toFoodLabels(product),
    available: product.available !== false,
    needsChoice,
    sectionIds: product.categoryIds ?? [],
    path: toDishPath(product),
  };
}

/** A child product as a variant; what it does not have is the dish's. */
export function toVariant(
  product: SwProduct,
  dish: Dish | undefined,
  currency: CurrencyCode,
): Variant {
  const ingredients = toIngredients(product);
  return {
    id: product.id,
    number: product.productNumber,
    name: nameOf(product) || dish?.name || "",
    optionIds: product.optionIds ?? [],
    price: priceOf(product.calculatedPrice, currency),
    listPrice: listPriceOf(product.calculatedPrice, currency),
    available: product.available !== false,
    media: toMedia(product.cover?.media) ?? dish?.media ?? null,
    ingredients: ingredients.length ? ingredients : (dish?.ingredients ?? []),
  };
}

export function toVariantGroups(groups: SwGroup[] | undefined): VariantGroup[] {
  return (groups ?? []).map((group) => ({
    id: group.id,
    name: nameOf(group),
    options: (group.options ?? []).map((option) => ({
      id: option.id,
      name: nameOf(option),
    })),
  }));
}

/** `productList` cross-sellings are the extra groups; empty ones are left out. */
export function toExtraGroups(
  elements: SwCrossSelling[] | undefined,
  currency: CurrencyCode,
): ExtraGroup[] {
  return (elements ?? []).flatMap((element) => {
    const group = element.crossSelling;
    const extras = (element.products ?? []).map((product) => ({
      id: product.id,
      number: product.productNumber,
      name: nameOf(product),
      price: priceOf(product.calculatedPrice, currency),
      available: product.available !== false,
    }));
    return group && extras.length
      ? [{ id: group.id, name: nameOf(group), extras }]
      : [];
  });
}

/** Menu sections are categories of type `page`; links and folders are not. */
export function toSection(category: SwCategory): MenuSection {
  return {
    id: category.id,
    name: nameOf(category),
    description: text(translated(category, "description")),
    icon: text(customField(category, ICON_FIELD)),
    media: toMedia(category.media),
    path: category.seoUrl || null,
    seo: {
      title: text(translated(category, "metaTitle")),
      description: text(translated(category, "metaDescription")),
      indexable: category.active !== false,
    },
    children: toSections(category.children),
  };
}

export function toSections(categories: SwCategory[] | null | undefined) {
  return (categories ?? [])
    .filter((category) => (category.type ?? "page") === "page")
    .map(toSection);
}

export function toListingFilters(listing: SwListing): ListingFilter[] {
  return (listing.aggregations?.properties?.entities ?? []).map((group) => ({
    id: group.id,
    name: nameOf(group),
    options: (group.options ?? []).map((option) => ({
      id: option.id,
      name: nameOf(option),
    })),
  }));
}

export function toListing(
  listing: SwListing,
  currency: CurrencyCode,
): MenuListing {
  return {
    dishes: (listing.elements ?? []).map((product) =>
      toDish(product, currency),
    ),
    total: listing.total ?? listing.elements?.length ?? 0,
    page: listing.page ?? 1,
    limit: listing.limit ?? PAGE_SIZE,
    filters: toListingFilters(listing),
    sortings: (listing.availableSortings ?? []).map((sorting) => ({
      key: sorting.key,
      label: translated(sorting, "label") ?? sorting.key,
    })),
    sorting: listing.sorting ?? null,
    filterOptionIds: listing.currentFilters?.properties ?? [],
  };
}

const EMPTY_LISTING: MenuListing = deepFreeze({
  dishes: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  filters: [],
  sortings: [],
  sorting: null,
  filterOptionIds: [],
});

/** The criteria of a listing query; Shopware ignores an unknown sorting. */
function listingCriteria(query: ListingQuery) {
  return {
    ...DISH_CRITERIA,
    limit: PAGE_SIZE,
    ...(query.sorting && { order: query.sorting }),
    ...(query.filterOptionIds?.length && {
      properties: [...new Set(query.filterOptionIds)].join("|"),
    }),
    ...(query.page && query.page > 1 && { p: query.page }),
  };
}

/** Shopware falls back to its default for a sorting it does not offer. */
function checkSorting(listing: SwListing, query: ListingQuery): void {
  if (
    query.sorting &&
    !(listing.availableSortings ?? []).some(
      (sorting) => sorting.key === query.sorting,
    )
  ) {
    throw new DomainError(
      "invalid_value",
      `The listing does not offer the sorting ${query.sorting}.`,
      { sorting: query.sorting },
    );
  }
}

export type ShopwareCatalogOptions = Readonly<{
  /** `public.shopBite.menuCategoryId`: overrides the plugin's menu root. */
  menuCategoryId?: string;
  /** Where a part left out of an answer is reported. */
  log?: AdapterLog;
  /** How long the sales channel's currency is kept, in ms. */
  currencyTtlMs?: number;
}>;

/** The sales channel's currency changes with its settings only. */
const CURRENCY_TTL_MS = 10 * 60_000;

/**
 * The sales channel's currency, in which every price is: one request per
 * `ttlMs` instead of one per answer; a failure is not kept.
 */
export function currencyReader(
  storeApi: StoreApi,
  ttlMs: number = CURRENCY_TTL_MS,
): () => Promise<CurrencyCode> {
  let kept: { at: number; code: Promise<CurrencyCode> } | undefined;
  return () => {
    if (!kept || Date.now() - kept.at > ttlMs) {
      const entry = {
        at: Date.now(),
        code: request("the context", () =>
          storeApi.get<{ currency?: { isoCode?: string } }>("/context"),
        ).then((context) => context.currency?.isoCode ?? "EUR"),
      };
      kept = entry;
      entry.code.catch(() => {
        if (kept === entry) kept = undefined;
      });
    }
    return kept.code;
  };
}

/**
 * Variants in a fixed order, their ids (the order Shopware lists them in
 * without a sorting), so a partial choice always finds the same variant.
 */
const VARIANT_ORDER = [{ field: "id", order: "ASC" }];

const EXTRAS_CRITERIA = {
  includes: {
    cross_selling_element: ["crossSelling", "products"],
    cross_selling: ["id", "name", "translated"],
    product: [
      "id",
      "productNumber",
      "name",
      "translated",
      "calculatedPrice",
      "available",
    ],
    calculated_price: ["unitPrice", "totalPrice"],
  },
};

/**
 * CatalogPort over the Store API with the ShopBite conventions: property
 * groups by name, `productList` cross-sellings as extras, child products
 * as variants, custom fields of the ShopBite plugin. No caching of menu
 * data here (ADR 0001); only the sales channel's currency, in which every
 * price is, is kept for a while.
 */
export function createShopwareCatalog(
  storeApi: StoreApi,
  options: ShopwareCatalogOptions = {},
): CatalogPort {
  const log: AdapterLog = options.log ?? (() => {});
  const post = <T>(
    what: string,
    path: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ) =>
    request(what, () => storeApi.post<T>(path, body, headers && { headers }));

  const currency = currencyReader(storeApi, options.currencyTtlMs);

  const menuRoot = menuRootReader(storeApi, options.menuCategoryId);

  const navigation = (root: string) =>
    post<SwCategory[]>(
      `the navigation of ${root}`,
      `/navigation/${root}/${root}`,
      {
        depth: 5,
        buildTree: true,
        includes: CATEGORY_INCLUDES,
        associations: { media: {} },
      },
    );

  const searchProducts = (what: string, criteria: Record<string, unknown>) =>
    post<{ elements?: SwProduct[] }>(
      what,
      "/product",
      { ...DISH_CRITERIA, ...criteria },
      DISH_HEADERS,
    ).then((result) => result.elements ?? []);

  /** A parent and its variants. */
  const family = (parentId: string) =>
    searchProducts(`the variants of ${parentId}`, {
      filter: [
        {
          type: "multi",
          operator: "or",
          queries: [
            { type: "equals", field: "id", value: parentId },
            { type: "equals", field: "parentId", value: parentId },
          ],
        },
      ],
      sort: VARIANT_ORDER,
      limit: PAGE_SIZE,
    });

  async function listing(
    what: string,
    path: string,
    body: Record<string, unknown>,
    query: ListingQuery,
  ): Promise<MenuListing> {
    const page = query.page ?? 1;
    const [result, code] = await Promise.all([
      post<SwListing>(
        what,
        path,
        { ...listingCriteria(query), ...body },
        { "sw-include-seo-urls": "true" },
      ).catch((error: unknown) => {
        // Shopware refuses a page after the last one; the port answers it
        // empty
        if (
          page > 1 &&
          isDomainError(error, "not_found") &&
          errorCodes(error.cause).includes(PAGE_OUT_OF_RANGE)
        ) {
          return null;
        }
        throw error;
      }),
      currency(),
    ]);
    if (!result) {
      return deepFreeze({
        ...EMPTY_LISTING,
        page,
        sorting: query.sorting ?? null,
        filterOptionIds: [...new Set(query.filterOptionIds ?? [])],
      });
    }
    checkSorting(result, query);
    return deepFreeze(toListing(result, code));
  }

  /**
   * The dish sheet. A known parent (from the number search) lets its
   * variants load together with the detail instead of after it.
   */
  async function getDish(
    dishId: Id,
    knownParentId: string | null = null,
  ): Promise<DishDetail> {
    const [detail, crossSellings, code, knownFamily] = await Promise.all([
      post<{ product: SwProduct; configurator?: SwGroup[] }>(
        `the dish ${dishId}`,
        `/product/${dishId}`,
        DISH_CRITERIA,
        DISH_HEADERS,
      ),
      post<SwCrossSelling[]>(
        `the extras of ${dishId}`,
        `/product/${dishId}/cross-selling`,
        EXTRAS_CRITERIA,
      ).catch((error: unknown) => {
        // the sheet opens without extras rather than not at all; a refusal
        // or an unknown dish is an answer (the detail request reports it),
        // only an outage is worth a log entry
        if (
          !isDomainError(error, "invalid_value") &&
          !isDomainError(error, "not_found")
        ) {
          log("Shopware: left out the extras of a dish that did not load.", {
            dishId,
            error,
          });
        }
        return [] as SwCrossSelling[];
      }),
      currency(),
      knownParentId ? family(knownParentId) : undefined,
    ]);
    const product = detail.product;
    // the detail route answers a parent with its default variant
    const parentId =
      product.parentId ?? ((product.childCount ?? 0) > 0 ? product.id : null);
    const members = !parentId
      ? []
      : parentId === knownParentId && knownFamily
        ? knownFamily
        : await family(parentId);
    const parent =
      members.find((candidate) => candidate.id === parentId) ?? product;
    const dish = toDish(parent, code);
    const variants = members
      .filter((candidate) => candidate.parentId === parent.id)
      .map((candidate) => toVariant(candidate, dish, code));
    return deepFreeze({
      ...dish,
      // a parent whose variants did not load is still a choice
      needsChoice: dish.needsChoice || variants.length > 0,
      priceFrom: dish.priceFrom || variants.length > 0,
      variantGroups: toVariantGroups(detail.configurator),
      variants,
      selectedVariantId: product.parentId ? product.id : null,
      extraGroups: toExtraGroups(crossSellings, code),
      upsell: customField(parent, UPSELL_FIELD) === true,
    });
  }

  return {
    getMenu: async () =>
      deepFreeze(toSections(await navigation(await menuRoot()))),
    getSection: async (sectionId) => {
      const [category, children] = await Promise.all([
        post<SwCategory>(`the section ${sectionId}`, `/category/${sectionId}`, {
          includes: CATEGORY_INCLUDES,
        }),
        navigation(sectionId),
      ]);
      return deepFreeze({
        ...toSection(category),
        children: toSections(children),
      });
    },
    listDishes: (sectionId, query = {}) =>
      listing(
        `the dishes of ${sectionId}`,
        `/product-listing/${sectionId}`,
        {},
        query,
      ),
    searchDishes: async (searchText, query = {}) => {
      const search = searchText.trim();
      if (!search) return EMPTY_LISTING;
      return listing("the search", "/search", { search }, query);
    },
    listMenuDishes: async () => {
      const code = await currency();
      const products: SwProduct[] = [];
      for (let page = 1; page <= MAX_MENU_PAGES; page++) {
        const elements = await searchProducts("the menu", {
          // main products only; extras have no section
          filter: [{ type: "equals", field: "parentId", value: null }],
          limit: PAGE_SIZE,
          page,
        });
        products.push(...elements);
        if (elements.length < PAGE_SIZE) break;
      }
      return deepFreeze(
        products
          .filter((product) => (product.categoryIds ?? []).length > 0)
          .map((product) => toDish(product, code)),
      );
    },
    getDish: (dishId) => getDish(dishId),
    findDishByNumber: async (number) => {
      const [product] = await searchProducts(`the dish number ${number}`, {
        filter: [{ type: "equals", field: "productNumber", value: number }],
        limit: 1,
      });
      if (!product) return null;
      const parentId =
        product.parentId ?? ((product.childCount ?? 0) > 0 ? product.id : null);
      return getDish(product.id, parentId);
    },
    findVariant: async (dishId, optionIds) => {
      if (!optionIds.length) return null;
      const [[variant], code] = await Promise.all([
        searchProducts(`a variant of ${dishId}`, {
          filter: [
            { type: "equals", field: "parentId", value: dishId },
            ...optionIds.map((id) => ({
              type: "equals",
              field: "optionIds",
              value: id,
            })),
          ],
          sort: VARIANT_ORDER,
          limit: 1,
        }).catch((error: unknown) => {
          // an id Shopware does not take has no variants
          if (isDomainError(error, "invalid_value")) return [];
          throw error;
        }),
        currency(),
      ]);
      return variant ? deepFreeze(toVariant(variant, undefined, code)) : null;
    },
    listTopSellers: async (limit) => {
      const [products, code] = await Promise.all([
        searchProducts("the top sellers", {
          // variants of a marked parent inherit the mark
          filter: [{ type: "equals", field: "markAsTopseller", value: true }],
          limit,
        }),
        currency(),
      ]);
      return deepFreeze(products.map((product) => toDish(product, code)));
    },
    listUpsellDishes: async (limit) => {
      const [products, code] = await Promise.all([
        searchProducts("the upsell dishes", {
          filter: [
            // a mark on a parent applies to its variants (inherited)
            {
              type: "equals",
              field: `customFields.${UPSELL_FIELD}`,
              value: true,
            },
            // no parents: Shopware counts only the children of main
            // products, so the child count of a variant is null, not 0
            {
              type: "multi",
              operator: "or",
              queries: [
                { type: "equals", field: "childCount", value: 0 },
                { type: "equals", field: "childCount", value: null },
              ],
            },
          ],
          sort: [{ field: "name", order: "ASC" }],
          limit,
        }),
        currency(),
      ]);
      return deepFreeze(products.map((product) => toDish(product, code)));
    },
  };
}
