import { createMemoryBackend, demoSeed } from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../server/adapters/shopware";
import {
  money,
  toDecimal,
  type Media,
  type MenuSection,
} from "../../shared/domain";
import type { CatalogScenario, ScenarioDish } from "./catalog.contract";
import type { AdapterFixture } from "./harness";

const euro = (amount: number, currency: string) =>
  money(Math.round(amount * 100), currency);

/** The memory adapter, seeded with the scenario's menu. */
export const memoryCatalog: AdapterFixture<CatalogScenario> = {
  adapter: "memory",
  create: (scenario) =>
    createMemoryBackend({
      ...demoSeed(),
      catalog: {
        sections: scenario.sections,
        offMenuSections: scenario.offMenuSections,
        dietFilters: scenario.dietFilters,
        sortings: scenario.sortings,
        defaultSorting: scenario.sortings[0]!.key,
        searchSortings: scenario.searchSortings,
        defaultSearchSorting: "score",
        dishes: scenario.dishes.map((dish) => ({
          id: dish.id,
          number: dish.number,
          name: dish.name,
          description: dish.description,
          price: euro(dish.price, scenario.currency),
          listPrice:
            dish.listPrice === undefined
              ? null
              : euro(dish.listPrice, scenario.currency),
          sectionIds: dish.sectionIds,
          ingredients: dish.ingredients,
          diets: dish.diets,
          kitchen: dish.kitchen ?? null,
          foodLabels: dish.foodLabels,
          available: dish.available,
          media: dish.media ?? null,
          path: dish.path ?? null,
          topSeller: dish.topSeller ?? false,
          upsell: dish.upsell ?? false,
          variantGroups: dish.variantGroups ?? [],
          variants: (dish.variants ?? []).map((variant) => ({
            ...variant,
            price: euro(variant.price, scenario.currency),
          })),
          extraGroups: dish.extraGroups ?? [],
        })),
      },
    }),
};

/* ------------------------------------------------------------------ */
/* Shopware: a fake Store API answering the scenario as Shopware does  */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;
type Product = Json & {
  id: string;
  parentId: string | null;
  productNumber: string;
  translated: Json;
  calculatedPrice: { unitPrice: number };
  available: boolean;
  categoryIds: string[] | null;
  optionIds: string[] | null;
  childCount: number | null;
  markAsTopseller: boolean;
  customFields: Json;
};

/** What ofetch throws for an HTTP error answer. */
const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), {
    name: "FetchError",
    statusCode: status,
    status,
  });

const option = (id: string, name: string, customFields: Json = {}) => ({
  id,
  name,
  translated: { name, customFields },
  customFields,
});
const group = (id: string, name: string, options: Json[]) => ({
  id,
  name,
  translated: { name },
  options,
});

function swMedia(media: Media | undefined) {
  if (!media) return null;
  return {
    url: media.url,
    alt: media.alt,
    translated: { alt: media.alt },
    metaData: { width: media.width, height: media.height },
    thumbnails: media.sources.map((source) => ({
      url: source.url,
      width: source.width,
      height: Math.round(
        ((media.height ?? 0) * source.width) / (media.width || 1),
      ),
    })),
  };
}

/** The property groups of a dish, as `sortedProperties` lists them. */
function sortedProperties(dish: ScenarioDish, scenario: CatalogScenario) {
  const groups: Json[] = [];
  if (dish.ingredients.length) {
    groups.push(
      group(
        "hauptzutaten",
        "Hauptzutaten",
        dish.ingredients.map((entry) => option(entry.id, entry.name)),
      ),
    );
  }
  for (const diet of dish.diets) {
    const filter = scenario.dietFilters[diet];
    groups.push(group(filter.id, filter.name, [option(filter.optionId, "Ja")]));
  }
  if (dish.kitchen) {
    groups.push(group("kueche", "Küche", [option("kueche-1", dish.kitchen)]));
  }
  const labels = (name: string, list: { code: string; name: string }[]) =>
    list.length &&
    groups.push(
      group(
        name.toLowerCase(),
        name,
        list.map((label, index) =>
          option(`${name}-${index}`, label.name, { shopbite_code: label.code }),
        ),
      ),
    );
  labels("Allergene", [...dish.foodLabels.allergens]);
  labels("Zusatzstoffe", [...dish.foodLabels.additives]);
  return groups;
}

const price = (unitPrice: number, listPrice?: number) => ({
  unitPrice,
  totalPrice: unitPrice,
  listPrice: listPrice === undefined ? null : { price: listPrice },
});

/** Dishes, variants and extras as Shopware products (inheritance on). */
function products(scenario: CatalogScenario): Product[] {
  const result: Product[] = [];
  for (const dish of scenario.dishes) {
    const variants = dish.variants ?? [];
    const properties = sortedProperties(dish, scenario);
    const customFields = {
      shopbite_allergens_checked: dish.foodLabels.checked,
      ...(dish.upsell && { shopbite_cart_upsell: true }),
    };
    const base = {
      parentId: null,
      name: dish.name,
      description: dish.description,
      translated: {
        name: dish.name,
        description: dish.description,
        customFields,
      },
      customFields,
      available: dish.available,
      cover: dish.media ? { media: swMedia(dish.media) } : null,
      sortedProperties: properties,
      categoryIds: [...dish.sectionIds],
      markAsTopseller: dish.topSeller ?? false,
    };
    result.push({
      ...base,
      id: dish.id,
      productNumber: dish.number,
      childCount: variants.length,
      optionIds: null,
      calculatedPrice: price(dish.price, dish.listPrice),
      calculatedCheapestPrice: variants.length
        ? price(Math.min(...variants.map((variant) => variant.price)))
        : price(dish.price),
      seoUrls: [
        {
          seoPathInfo: dish.path
            ? dish.path.slice(1)
            : `${dish.name.replace(/ /g, "-")}/${dish.number}`,
          isCanonical: true,
        },
      ],
    });
    for (const variant of variants) {
      result.push({
        ...base,
        // own fields of a variant are empty; inheritance fills them in
        name: null,
        description: null,
        id: variant.id,
        parentId: dish.id,
        productNumber: variant.number,
        childCount: null,
        available: variant.available,
        optionIds: [...variant.optionIds],
        calculatedPrice: price(variant.price),
        calculatedCheapestPrice: price(variant.price),
        seoUrls: [
          {
            seoPathInfo: `${dish.name.replace(/ /g, "-")}/${variant.number}`,
            isCanonical: true,
          },
        ],
      });
    }
  }
  for (const extraGroup of scenario.dishes.flatMap(
    (dish) => dish.extraGroups ?? [],
  )) {
    for (const extra of extraGroup.extras) {
      if (result.some((product) => product.id === extra.id)) continue;
      const customFields = {};
      result.push({
        id: extra.id,
        parentId: null,
        productNumber: extra.number,
        name: extra.name,
        translated: { name: extra.name, customFields },
        customFields,
        available: extra.available,
        calculatedPrice: price(toDecimal(extra.price)),
        categoryIds: null,
        optionIds: null,
        childCount: 0,
        markAsTopseller: false,
        sortedProperties: [],
      });
    }
  }
  return result;
}

type Filter = {
  type: string;
  field?: string;
  value?: unknown;
  operator?: string;
  queries?: Filter[];
};

function fieldOf(product: Product, field: string): unknown {
  return field
    .split(".")
    .reduce<unknown>(
      (value, key) => (value as Json | undefined)?.[key],
      product,
    );
}

function matches(product: Product, filter: Filter): boolean {
  switch (filter.type) {
    case "equals": {
      const value = fieldOf(product, filter.field!);
      return Array.isArray(value)
        ? value.includes(filter.value)
        : (value ?? null) === filter.value;
    }
    case "equalsAny":
      return String(filter.value)
        .split("|")
        .includes(String(fieldOf(product, filter.field!)));
    case "multi":
      return filter.operator === "or"
        ? (filter.queries ?? []).some((query) => matches(product, query))
        : (filter.queries ?? []).every((query) => matches(product, query));
    default:
      throw new Error(`unexpected filter ${filter.type}`);
  }
}

const SORT: Record<string, (a: Product, b: Product) => number> = {
  id: (a, b) => a.id.localeCompare(b.id),
  "name-asc": (a, b) =>
    String(a.translated.name).localeCompare(String(b.translated.name), "de"),
  "name-desc": (a, b) =>
    String(b.translated.name).localeCompare(String(a.translated.name), "de"),
  "price-asc": (a, b) =>
    a.calculatedPrice.unitPrice - b.calculatedPrice.unitPrice,
  "price-desc": (a, b) =>
    b.calculatedPrice.unitPrice - a.calculatedPrice.unitPrice,
  score: () => 0,
};

function walk(sections: readonly MenuSection[]): MenuSection[] {
  return sections.flatMap((section) => [section, ...walk(section.children)]);
}

function swCategory(section: MenuSection, depth: number): Json {
  const customFields = section.icon
    ? { shopbite_category_icon: section.icon }
    : {};
  return {
    id: section.id,
    name: section.name,
    description: section.description,
    metaTitle: section.seo.title,
    metaDescription: section.seo.description,
    customFields,
    translated: {
      name: section.name,
      description: section.description,
      metaTitle: section.seo.title,
      metaDescription: section.seo.description,
      customFields,
    },
    type: "page",
    active: section.seo.indexable,
    seoUrl: section.path,
    media: swMedia(section.media ?? undefined),
    children:
      depth > 0
        ? section.children.map((child) => swCategory(child, depth - 1))
        : null,
  };
}

/**
 * The Shopware adapter against a fake Store API that answers the scenario
 * as Shopware 6 with the ShopBite plugin does: products with inherited
 * fields, property groups by name, `productList` cross-sellings, a detail
 * route that answers a parent with its first available variant, listings
 * that ignore an unknown sorting, 404 for unknown entities.
 */
export const shopwareCatalog: AdapterFixture<CatalogScenario> = {
  adapter: "shopware",
  create: (scenario) => {
    const all = products(scenario);
    const sections = [
      ...walk(scenario.sections),
      ...walk(scenario.offMenuSections),
    ];
    const productById = (id: string) =>
      all.find((product) => product.id === id);
    const listed = all.filter(
      (product) => product.parentId === null && product.categoryIds,
    );

    function listing(
      candidates: Product[],
      body: Json,
      sortings: CatalogScenario["sortings"],
      fallback: string,
    ) {
      const offered = sortings.map((sorting) => sorting.key);
      const sorting = offered.includes(String(body.order))
        ? String(body.order)
        : fallback;
      const selected = body.properties
        ? String(body.properties).split("|")
        : [];
      const groupsOf = (product: Product) =>
        (product.sortedProperties as {
          id: string;
          options: { id: string }[];
        }[]) ?? [];
      // options of one group: any; of different groups: all
      const byGroup = new Map<string, string[]>();
      for (const id of selected) {
        const owner = Object.values(scenario.dietFilters).find(
          (filter) => filter.optionId === id,
        );
        if (owner)
          byGroup.set(owner.id, [...(byGroup.get(owner.id) ?? []), id]);
      }
      const found = candidates
        .filter((product) =>
          [...byGroup.values()].every((ids) =>
            groupsOf(product).some((g) =>
              g.options.some((o) => ids.includes(o.id)),
            ),
          ),
        )
        .sort(SORT[sorting]);
      const page = Number(body.p ?? 1);
      const limit = Number(body.limit ?? 24);
      if (page > 1 && (page - 1) * limit >= found.length) {
        // Shopware refuses a page after the last one
        throw Object.assign(httpError(404, "page out of range"), {
          data: {
            errors: [
              { status: "404", code: "PRODUCT__LISTING_PAGE_OUT_OF_RANGE" },
            ],
          },
        });
      }
      const filterable = Object.values(scenario.dietFilters).filter((filter) =>
        candidates.some((product) =>
          groupsOf(product).some((g) => g.id === filter.id),
        ),
      );
      return {
        elements: found.slice((page - 1) * limit, page * limit),
        total: found.length,
        page,
        limit,
        sorting,
        availableSortings: sortings.map((entry) => ({
          key: entry.key,
          label: entry.label,
          translated: { label: entry.label },
        })),
        currentFilters: { properties: selected, navigationId: null },
        aggregations: {
          properties: {
            entities: filterable.map((filter) =>
              group(filter.id, filter.name, [option(filter.optionId, "Ja")]),
            ),
          },
        },
      };
    }

    function inSection(product: Product, sectionId: string) {
      const section = sections.find((entry) => entry.id === sectionId)!;
      const ids = walk([section]).map((entry) => entry.id);
      return (product.categoryIds ?? []).some((id) => ids.includes(id));
    }

    const post = async (path: string, body: Json): Promise<unknown> => {
      let match: RegExpMatchArray | null;
      if ((match = path.match(/^\/product-listing\/(.+)$/))) {
        if (!sections.some((section) => section.id === match![1])) {
          throw httpError(404, "Could not find category");
        }
        return listing(
          listed.filter((product) => inSection(product, match![1]!)),
          body,
          scenario.sortings,
          scenario.sortings[0]!.key,
        );
      }
      if (path === "/search") {
        const words = String(body.search).toLowerCase().split(/\s+/);
        return listing(
          listed.filter((product) =>
            words.every((word) =>
              String(product.translated.name).toLowerCase().includes(word),
            ),
          ),
          body,
          scenario.searchSortings,
          "score",
        );
      }
      if (path === "/product") {
        const filters = (body.filter as Filter[] | undefined) ?? [];
        let found = all.filter((product) =>
          filters.every((filter) => matches(product, filter)),
        );
        for (const sort of (body.sort as
          { field: string; order: string }[] | undefined) ?? []) {
          found = [...found].sort(
            (a, b) =>
              String(fieldOf(a, `translated.${sort.field}`)).localeCompare(
                String(fieldOf(b, `translated.${sort.field}`)),
                "de",
              ) * (sort.order === "DESC" ? -1 : 1),
          );
        }
        const limit = Number(body.limit ?? 100);
        const page = Number(body.page ?? 1);
        return { elements: found.slice((page - 1) * limit, page * limit) };
      }
      if ((match = path.match(/^\/product\/([^/]+)\/cross-selling$/))) {
        const product = productById(match[1]!);
        if (!product) throw httpError(404, "Could not find product");
        const owner = scenario.dishes.find(
          (dish) => dish.id === (product.parentId ?? product.id),
        );
        return (owner?.extraGroups ?? []).map((extraGroup) => ({
          crossSelling: {
            id: extraGroup.id,
            name: extraGroup.name,
            translated: { name: extraGroup.name },
          },
          products: extraGroup.extras.map((extra) => productById(extra.id)),
          total: extraGroup.extras.length,
        }));
      }
      if ((match = path.match(/^\/product\/([^/]+)$/))) {
        const requested = productById(match[1]!);
        if (!requested) throw httpError(404, "Could not find product");
        const dish = scenario.dishes.find(
          (entry) => entry.id === (requested.parentId ?? requested.id),
        )!;
        const variants = all.filter((product) => product.parentId === dish.id);
        const product =
          requested.parentId === null && variants.length
            ? (variants.find((variant) => variant.available) ?? variants[0]!)
            : requested;
        return {
          product,
          configurator: (dish.variantGroups ?? []).map((variantGroup) =>
            group(
              variantGroup.id,
              variantGroup.name,
              variantGroup.options.map((entry) => option(entry.id, entry.name)),
            ),
          ),
        };
      }
      if ((match = path.match(/^\/category\/(.+)$/))) {
        const section = sections.find((entry) => entry.id === match![1]);
        if (!section) throw httpError(404, "Could not find category");
        return swCategory(section, 0);
      }
      if ((match = path.match(/^\/navigation\/([^/]+)\/([^/]+)$/))) {
        const root = match[2];
        if (root === "menu-root") {
          return [
            ...scenario.sections.map((section) => swCategory(section, 5)),
            // a link in the menu is no section
            {
              id: "link",
              name: "Instagram",
              type: "link",
              seoUrl: null,
              children: [],
            },
          ];
        }
        const section = sections.find((entry) => entry.id === root);
        if (!section) throw httpError(404, "Could not find category");
        return section.children.map((child) => swCategory(child, 5));
      }
      throw new Error(`unexpected POST ${path}`);
    };

    const storeApi: StoreApi = {
      get: async <T>(path: string) => {
        if (path === "/context") {
          return { currency: { isoCode: scenario.currency } } as T;
        }
        if (path === "/shopbite/config") {
          return { isCheckoutEnabled: true, menuCategoryId: "menu-root" } as T;
        }
        throw new Error(`unexpected GET ${path}`);
      },
      post: async <T>(path: string, body: Json) =>
        structuredClone(await post(path, body)) as T,
    };
    return createShopwareBackend({
      storeApi,
      storeUrl: "https://nord.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    });
  },
};
