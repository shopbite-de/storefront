import { v5 as uuidv5 } from "uuid";
import {
  money,
  type Diet,
  type FoodLabels,
  type Media,
  type MenuSection,
} from "../../../shared/domain";
import type { MemoryCatalog, MemoryDish, MemoryVariant } from "./catalog";
import menu from "./demo-menu.json";

/**
 * The quickstart's demo menu (`demo-menu.json` is its `setup/menu.json`)
 * in domain terms. Ids are the ones the quickstart's setup gives the
 * Shopware entities (uuid5 of the same keys), so a storefront on the
 * memory adapter shows the menu under the quickstart's paths and ids.
 */
type MenuJson = {
  categories: { key: string; name: string; icon: string }[];
  products: {
    number: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    ingredients?: string[];
    vegetarian?: boolean;
    vegan?: boolean;
    crossSelling?: string;
    variants?: Record<string, { name: string; surcharge: number }[]>;
  }[];
};

const NAMESPACE = "0b5f0c1e-7a4d-4c3b-9e8f-5d6a7b8c9d0e";
/** The quickstart setup's id of an entity key (`hid()` in its setup.py). */
export const id = (key: string) => uuidv5(key, NAMESPACE).replaceAll("-", "");

// The demo marks a few dishes; the quickstart's Shopware has none set.
const TOP_SELLERS = new Set(["21", "3", "35"]);
const UPSELL = new Set(["12", "200"]);
const FOOD_LABELS: Readonly<Record<string, FoodLabels>> = {
  "21": {
    allergens: [
      { code: "A", name: "Weizen" },
      { code: "G", name: "Milch (inkl. Laktose)" },
    ],
    additives: [],
    checked: true,
  },
};
const NO_FOOD_LABELS: FoodLabels = {
  allergens: [],
  additives: [],
  checked: false,
};

/** `Extras & Beilagen` → `Extras-Beilagen`, `Getränke` → `Getraenke`. */
function slug(name: string): string {
  return name
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const euro = (amount: number) => money(Math.round(amount * 100), "EUR");

/**
 * Width and height of the photos in `demoImages.ts`, which only the media
 * route loads (`/api/menu/media/[name]`).
 */
const PHOTOS: Readonly<Record<string, { width: number; height: number }>> = {
  "3": { width: 320, height: 240 },
  "21": { width: 320, height: 240 },
  "35": { width: 320, height: 240 },
  "95": { width: 320, height: 240 },
  "133": { width: 320, height: 240 },
  "139": { width: 320, height: 240 },
  "144": { width: 320, height: 180 },
};

function photo(number: string): Media | null {
  const image = PHOTOS[number];
  if (!image) return null;
  const url = `/api/menu/media/${number}.webp`;
  return {
    url,
    alt: null,
    width: image.width,
    height: image.height,
    sources: [{ url, width: image.width }],
  };
}

export function demoMenu(): MemoryCatalog {
  const { categories, products } = menu as unknown as MenuJson;
  const sectionId = (key: string) => id(`category:${key}`);
  const sections: MenuSection[] = categories.map((category) => ({
    id: sectionId(category.key),
    name: category.name,
    description: null,
    icon: category.icon,
    media: null,
    path: `/Speisekarte/${slug(category.name)}/`,
    seo: { title: null, description: null, indexable: true },
    children: [],
  }));
  const extras = products
    .filter((product) => !product.category)
    .map((product) => ({
      id: id(`product:${product.number}`),
      number: `EXTRA-${product.number}`,
      name: product.name,
      price: euro(product.price),
      available: true,
    }));
  const option = (group: string, name: string) => id(`po:${group}:${name}`);

  const dishes: MemoryDish[] = products.flatMap((product) => {
    if (!product.category) return [];
    const nr = product.number;
    const diets: Diet[] = product.vegan
      ? ["vegan"]
      : product.vegetarian
        ? ["vegetarian"]
        : [];
    const spec = Object.entries(product.variants ?? {});
    // every combination of one option per group, in the menu's order
    const combinations = spec.reduce<
      { group: string; name: string; surcharge: number }[][]
    >(
      (combos, [group, options]) =>
        combos.flatMap((combo) =>
          options.map((entry) => [...combo, { group, ...entry }]),
        ),
      spec.length ? [[]] : [],
    );
    const variants: MemoryVariant[] = combinations.map((combo) => ({
      id: id(`variant:${nr}:${combo.map((entry) => entry.name).join("|")}`),
      number: `SB-${nr}-${combo
        .map((entry) => entry.name.split(" ")[0]!.toLowerCase())
        .join("-")}`,
      optionIds: combo.map((entry) => option(entry.group, entry.name)),
      price: euro(
        product.price + combo.reduce((sum, entry) => sum + entry.surcharge, 0),
      ),
      available: true,
    }));
    return [
      {
        id: id(`product:${nr}`),
        number: `SB-${nr}`,
        name: product.name,
        description: product.description || null,
        price: euro(product.price),
        listPrice: null,
        sectionIds: [sectionId(product.category)],
        // the ingredient group is sorted like the quickstart's options
        ingredients: [...(product.ingredients ?? [])]
          .sort()
          .map((name) => ({ id: option("Hauptzutaten", name), name })),
        diets,
        kitchen: null,
        foodLabels: FOOD_LABELS[nr] ?? NO_FOOD_LABELS,
        available: true,
        media: photo(nr),
        path: null,
        topSeller: TOP_SELLERS.has(nr),
        upsell: UPSELL.has(nr),
        variantGroups: spec.map(([group, options]) => ({
          id: id(`pg:${group}`),
          name: group,
          options: options.map((entry) => ({
            id: option(group, entry.name),
            name: entry.name,
          })),
        })),
        variants,
        extraGroups:
          product.crossSelling === "extras"
            ? [{ id: id(`xs:${nr}:extras`), name: "Extras", extras }]
            : [],
      },
    ];
  });

  const sortings = [
    { key: "name-asc", label: "Name A-Z" },
    { key: "name-desc", label: "Name Z-A" },
    { key: "price-asc", label: "Preis aufsteigend" },
    { key: "price-desc", label: "Preis absteigend" },
  ];
  const topseller = { key: "topseller", label: "Topseller" };
  return {
    // the quickstart's "Speisekarte" below the navigation root
    menuRoot: {
      id: id("category:speisekarte"),
      name: "Speisekarte",
      description: null,
      icon: "i-lucide-utensils",
      media: null,
      path: "/Speisekarte/",
      seo: { title: null, description: null, indexable: true },
    },
    sections,
    offMenuSections: [],
    dishes,
    dietFilters: {
      vegetarian: {
        id: id("pg:Vegetarisch"),
        name: "Vegetarisch",
        optionId: option("Vegetarisch", "Ja"),
      },
      vegan: {
        id: id("pg:Vegan"),
        name: "Vegan",
        optionId: option("Vegan", "Ja"),
      },
    },
    sortings: [...sortings, topseller],
    defaultSorting: "name-asc",
    searchSortings: [
      ...sortings,
      { key: "score", label: "Beste Ergebnisse" },
      topseller,
    ],
    defaultSearchSorting: "score",
  };
}
