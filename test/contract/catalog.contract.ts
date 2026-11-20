import { expect, it } from "vitest";
import {
  isDomainError,
  money,
  type Dish,
  type ExtraGroup,
  type FoodLabels,
  type Id,
  type Ingredient,
  type Media,
  type MenuSection,
  type VariantGroup,
} from "../../shared/domain";
import { defineContract } from "./harness";

/** A dish of the scenario as the restaurant keeps it, in domain terms. */
export type ScenarioDish = Readonly<{
  id: Id;
  number: string;
  name: string;
  description: string | null;
  /** For a dish with variants: the price of the dish itself. */
  price: number;
  listPrice?: number;
  sectionIds: readonly Id[];
  ingredients: readonly Ingredient[];
  diets: Dish["diets"];
  kitchen?: string;
  foodLabels: FoodLabels;
  available: boolean;
  media?: Media;
  /** The link the backend keeps for the dish, if any. */
  path?: string;
  topSeller?: boolean;
  upsell?: boolean;
  variantGroups?: readonly VariantGroup[];
  /** In the dish's order; the first available one is the default. */
  variants?: readonly Readonly<{
    id: Id;
    number: string;
    optionIds: readonly Id[];
    price: number;
    available: boolean;
  }>[];
  extraGroups?: readonly ExtraGroup[];
}>;

/** A menu as the CatalogPort suite describes it, in domain terms. */
export type CatalogScenario = Readonly<{
  currency: string;
  /** The menu tree, in menu order. */
  sections: readonly MenuSection[];
  /** Sections taken off the menu that still have their page. */
  offMenuSections: readonly MenuSection[];
  dishes: readonly ScenarioDish[];
  /** The diet filters: group and option ("Ja") ids. */
  dietFilters: Readonly<
    Record<Dish["diets"][number], { id: Id; name: string; optionId: Id }>
  >;
  sortings: readonly Readonly<{ key: string; label: string }>[];
  /** The sortings of a search: `sortings` plus the relevance sorting. */
  searchSortings: readonly Readonly<{ key: string; label: string }>[];
}>;

const NO_LABELS: FoodLabels = { allergens: [], additives: [], checked: false };
const ingredient = (id: string, name: string): Ingredient => ({ id, name });
const TOMATO = ingredient("tomatensosse", "Tomatensoße");
const CHEESE = ingredient("kaese", "Käse");

const section = (
  id: string,
  name: string,
  path: string,
  extra: Partial<MenuSection> = {},
): MenuSection => ({
  id,
  name,
  description: null,
  icon: null,
  media: null,
  path,
  seo: { title: null, description: null, indexable: true },
  children: [],
  ...extra,
});

const SPEZIAL = section(
  "pizza-spezial",
  "Spezial",
  "/Speisekarte/Pizza/Spezial/",
);
const PIZZA = section("pizza", "Pizza", "/Speisekarte/Pizza/", {
  description: "Aus dem Steinofen",
  icon: "i-lucide-pizza",
  media: {
    url: "https://cdn.example.com/pizza.webp",
    alt: "Pizza",
    width: 1600,
    height: 900,
    sources: [{ url: "https://cdn.example.com/pizza-800.webp", width: 800 }],
  },
  seo: {
    title: "Pizza bestellen",
    description: "Pizza aus dem Steinofen, geliefert.",
    indexable: true,
  },
  children: [SPEZIAL],
});
const SALATE = section("salate", "Salate", "/Speisekarte/Salate/");
const FLEISCH = section(
  "fleisch",
  "Fleischgerichte",
  "/Speisekarte/Fleischgerichte/",
);
const NACHTISCH = section("nachtisch", "Nachtisch", "/Speisekarte/Nachtisch/", {
  seo: { title: null, description: null, indexable: false },
});

const EXTRAS: ExtraGroup = {
  id: "pizza-extras",
  name: "Extras",
  extras: [
    {
      id: "extra-kaese",
      number: "900",
      name: "Extra Käse",
      price: money(100, "EUR"),
      available: true,
    },
    {
      id: "extra-salami",
      number: "901",
      name: "Extra Salami",
      price: money(150, "EUR"),
      available: false,
    },
  ],
};

const MARGHERITA_MEDIA: Media = {
  url: "https://cdn.example.com/21.webp",
  alt: null,
  width: 1200,
  height: 900,
  sources: [
    { url: "https://cdn.example.com/21-400.webp", width: 400 },
    { url: "https://cdn.example.com/21-800.webp", width: 800 },
  ],
};

export const MENU: CatalogScenario = {
  currency: "EUR",
  sections: [PIZZA, SALATE, FLEISCH],
  offMenuSections: [NACHTISCH],
  dietFilters: {
    vegetarian: {
      id: "vegetarisch",
      name: "Vegetarisch",
      optionId: "vegetarisch-ja",
    },
    vegan: { id: "vegan", name: "Vegan", optionId: "vegan-ja" },
  },
  sortings: [
    { key: "name-asc", label: "Name A-Z" },
    { key: "name-desc", label: "Name Z-A" },
    { key: "price-asc", label: "Preis aufsteigend" },
    { key: "price-desc", label: "Preis absteigend" },
  ],
  searchSortings: [
    { key: "name-asc", label: "Name A-Z" },
    { key: "name-desc", label: "Name Z-A" },
    { key: "price-asc", label: "Preis aufsteigend" },
    { key: "price-desc", label: "Preis absteigend" },
    { key: "score", label: "Beste Ergebnisse" },
  ],
  dishes: [
    {
      id: "margherita",
      number: "21",
      name: "Pizza Margherita",
      description: "Mit Tomatensoße und Käse",
      price: 7,
      sectionIds: ["pizza"],
      ingredients: [TOMATO, CHEESE],
      diets: ["vegetarian"],
      kitchen: "Italienisch",
      foodLabels: {
        allergens: [
          { code: "A", name: "Weizen" },
          { code: "G", name: "Milch (inkl. Laktose)" },
        ],
        additives: [{ code: "1", name: "mit Farbstoff" }],
        checked: true,
      },
      available: true,
      media: MARGHERITA_MEDIA,
      path: "/Speisekarte/Pizza/?produkt=21",
      upsell: true,
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
        {
          id: "margherita-normal",
          number: "21-normal",
          optionIds: ["normal"],
          price: 7,
          available: true,
        },
        {
          id: "margherita-gross",
          number: "21-groß",
          optionIds: ["gross"],
          price: 10,
          available: true,
        },
      ],
      extraGroups: [EXTRAS],
    },
    {
      id: "salami",
      number: "22",
      name: "Pizza Salami",
      description: null,
      price: 8,
      sectionIds: ["pizza-spezial"],
      ingredients: [TOMATO, CHEESE, ingredient("salami", "Salami")],
      diets: [],
      foodLabels: NO_LABELS,
      available: true,
      topSeller: true,
      extraGroups: [EXTRAS],
    },
    {
      id: "caprese",
      number: "3",
      name: "Mozzarella Caprese",
      description: "Tomaten und Mozzarella mit Basilikum",
      price: 9.5,
      sectionIds: ["salate"],
      ingredients: [
        ingredient("tomaten", "Tomaten"),
        ingredient("mozzarella", "Mozzarella"),
      ],
      diets: ["vegetarian"],
      foodLabels: { allergens: [], additives: [], checked: true },
      available: true,
      topSeller: true,
    },
    {
      id: "verde",
      number: "12",
      name: "Insalata verde",
      description: null,
      price: 5,
      listPrice: 6,
      sectionIds: ["salate"],
      ingredients: [ingredient("eisberg", "Eisbergsalat")],
      diets: ["vegan"],
      foodLabels: NO_LABELS,
      available: true,
      upsell: true,
    },
    {
      id: "camembert",
      number: "4",
      name: "Gebackener Camembert",
      description: null,
      price: 6.5,
      sectionIds: ["salate"],
      ingredients: [],
      diets: ["vegetarian"],
      foodLabels: NO_LABELS,
      available: false,
    },
    {
      id: "bistecca",
      number: "123",
      name: "Bistecca alla Griglia",
      description: "Gegrilltes Rumpsteak",
      price: 24,
      sectionIds: ["fleisch"],
      ingredients: [],
      diets: [],
      foodLabels: NO_LABELS,
      available: true,
      variantGroups: [
        {
          id: "beilage",
          name: "Beilage",
          options: [
            { id: "pommes", name: "Pommes frites" },
            { id: "reis", name: "Reis" },
          ],
        },
        {
          id: "garstufe",
          name: "Garstufe",
          options: [
            { id: "medium", name: "Medium" },
            { id: "durch", name: "Durchgebraten" },
          ],
        },
      ],
      variants: [
        {
          id: "bistecca-pommes-medium",
          number: "123-pommes-medium",
          optionIds: ["pommes", "medium"],
          price: 24,
          available: false,
        },
        {
          id: "bistecca-pommes-durch",
          number: "123-pommes-durch",
          optionIds: ["pommes", "durch"],
          price: 24,
          available: true,
        },
        {
          id: "bistecca-reis-medium",
          number: "123-reis-medium",
          optionIds: ["reis", "medium"],
          price: 25,
          available: true,
        },
        {
          id: "bistecca-reis-durch",
          number: "123-reis-durch",
          optionIds: ["reis", "durch"],
          price: 25,
          available: true,
        },
      ],
    },
  ],
};

const EUR = (cents: number) => money(cents, "EUR");

/** Pizza Margherita as its menu card shows it. */
const MARGHERITA: Dish = {
  id: "margherita",
  number: "21",
  name: "Pizza Margherita",
  description: "Mit Tomatensoße und Käse",
  price: EUR(700),
  listPrice: null,
  priceFrom: true,
  media: MARGHERITA_MEDIA,
  ingredients: [TOMATO, CHEESE],
  diets: ["vegetarian"],
  kitchen: "Italienisch",
  foodLabels: MENU.dishes[0]!.foodLabels,
  available: true,
  needsChoice: true,
  sectionIds: ["pizza"],
  path: "/Speisekarte/Pizza/?produkt=21",
};

const names = (dishes: readonly Dish[]) => dishes.map((dish) => dish.name);
const ids = (dishes: readonly { id: Id }[]) => dishes.map((dish) => dish.id);

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
}

export const catalogContract = defineContract<"catalog", CatalogScenario>(
  "catalog",
  (given) => {
    it("answers the menu as a tree of sections in menu order", async () => {
      const catalog = await given(MENU);
      expect(await catalog.getMenu()).toEqual([PIZZA, SALATE, FLEISCH]);
    });

    it("answers a section with its sub-sections and SEO data", async () => {
      const catalog = await given(MENU);
      expect(await catalog.getSection("pizza")).toEqual(PIZZA);
    });

    it("keeps the page of a section taken off the menu, not indexable", async () => {
      const catalog = await given(MENU);
      expect(await catalog.getSection("nachtisch")).toEqual(NACHTISCH);
    });

    it("rejects an unknown section with not_found", async () => {
      const catalog = await given(MENU);
      const error = await rejection(catalog.getSection("unbekannt"));
      expect(isDomainError(error, "not_found")).toBe(true);
    });

    it("lists the dishes of a section and its sub-sections, never variants", async () => {
      const catalog = await given(MENU);
      const listing = await catalog.listDishes("pizza");
      expect(listing.dishes).toEqual([
        MARGHERITA,
        expect.objectContaining({
          id: "salami",
          sectionIds: ["pizza-spezial"],
        }),
      ]);
      expect(listing).toMatchObject({ total: 2, page: 1, filterOptionIds: [] });
      expect(listing.limit).toBeGreaterThanOrEqual(2);
    });

    it("maps a dish without variants, its link left to the storefront", async () => {
      const catalog = await given(MENU);
      const [salami] = (await catalog.listDishes("pizza-spezial")).dishes;
      expect(salami).toEqual({
        id: "salami",
        number: "22",
        name: "Pizza Salami",
        description: null,
        price: EUR(800),
        listPrice: null,
        priceFrom: false,
        media: null,
        ingredients: [TOMATO, CHEESE, { id: "salami", name: "Salami" }],
        diets: [],
        kitchen: null,
        foodLabels: NO_LABELS,
        available: true,
        needsChoice: false,
        sectionIds: ["pizza-spezial"],
        path: null,
      });
    });

    it("says which dishes are sold out and which have a former price", async () => {
      const catalog = await given(MENU);
      const { dishes } = await catalog.listDishes("salate");
      expect(dishes.find((dish) => dish.id === "camembert")?.available).toBe(
        false,
      );
      expect(dishes.find((dish) => dish.id === "verde")?.listPrice).toEqual(
        EUR(600),
      );
    });

    it("sorts by name unless the guest chooses another of the offered sortings", async () => {
      const catalog = await given(MENU);
      const listing = await catalog.listDishes("salate");
      expect(listing.sortings).toEqual(MENU.sortings);
      expect(listing.sorting).toBe("name-asc");
      expect(names(listing.dishes)).toEqual([
        "Gebackener Camembert",
        "Insalata verde",
        "Mozzarella Caprese",
      ]);
      const byPrice = await catalog.listDishes("salate", {
        sorting: "price-desc",
      });
      expect(byPrice.sorting).toBe("price-desc");
      expect(ids(byPrice.dishes)).toEqual(["caprese", "camembert", "verde"]);
    });

    it("rejects a sorting the listing does not offer", async () => {
      const catalog = await given(MENU);
      const error = await rejection(
        catalog.listDishes("salate", { sorting: "unbekannt" }),
      );
      expect(isDomainError(error, "invalid_value")).toBe(true);
    });

    it("offers the diets of the section's dishes as filters", async () => {
      const catalog = await given(MENU);
      const vegetarian = {
        id: "vegetarisch",
        name: "Vegetarisch",
        options: [{ id: "vegetarisch-ja", name: "Ja" }],
      };
      const vegan = {
        id: "vegan",
        name: "Vegan",
        options: [{ id: "vegan-ja", name: "Ja" }],
      };
      expect((await catalog.listDishes("pizza")).filters).toEqual([vegetarian]);
      expect((await catalog.listDishes("salate")).filters).toEqual([
        vegetarian,
        vegan,
      ]);
    });

    it("lists only the dishes that match the selected filter options", async () => {
      const catalog = await given(MENU);
      const listing = await catalog.listDishes("salate", {
        filterOptionIds: ["vegetarisch-ja"],
      });
      expect(ids(listing.dishes)).toEqual(["camembert", "caprese"]);
      expect(listing.filterOptionIds).toEqual(["vegetarisch-ja"]);
      expect(listing.total).toBe(2);
      const both = await catalog.listDishes("salate", {
        filterOptionIds: ["vegetarisch-ja", "vegan-ja"],
      });
      // one option of each filter: no dish is both
      expect(both.dishes).toEqual([]);
    });

    it("answers a page after the last one empty", async () => {
      const catalog = await given(MENU);
      const listing = await catalog.listDishes("salate", { page: 2 });
      expect(listing).toMatchObject({ dishes: [], total: 3, page: 2 });
    });

    it("rejects the listing of an unknown section with not_found", async () => {
      const catalog = await given(MENU);
      const error = await rejection(catalog.listDishes("unbekannt"));
      expect(isDomainError(error, "not_found")).toBe(true);
    });

    it("finds dishes by a word of their name, by relevance first", async () => {
      const catalog = await given(MENU);
      const result = await catalog.searchDishes("pizza");
      expect(ids(result.dishes).sort()).toEqual(["margherita", "salami"]);
      expect(result.dishes.find((dish) => dish.id === "margherita")).toEqual(
        MARGHERITA,
      );
      expect(result.sortings).toEqual(MENU.searchSortings);
      expect(result.sorting).toBe("score");
      const byName = await catalog.searchDishes("PIZZA", {
        sorting: "name-desc",
      });
      expect(names(byName.dishes)).toEqual([
        "Pizza Salami",
        "Pizza Margherita",
      ]);
    });

    it("finds nothing for an empty or unknown text", async () => {
      const catalog = await given(MENU);
      expect((await catalog.searchDishes("  ")).dishes).toEqual([]);
      expect((await catalog.searchDishes("xyzxyz")).dishes).toEqual([]);
    });

    it("lists every dish on the menu once, without variants and extras", async () => {
      const catalog = await given(MENU);
      const dishes = await catalog.listMenuDishes();
      expect(ids(dishes).sort()).toEqual([
        "bistecca",
        "camembert",
        "caprese",
        "margherita",
        "salami",
        "verde",
      ]);
      expect(dishes.find((dish) => dish.id === "margherita")).toEqual(
        MARGHERITA,
      );
    });

    it("answers a dish with variants for the sheet, its default variant selected", async () => {
      const catalog = await given(MENU);
      expect(await catalog.getDish("margherita")).toEqual({
        ...MARGHERITA,
        variantGroups: MENU.dishes[0]!.variantGroups,
        variants: [
          {
            id: "margherita-normal",
            number: "21-normal",
            name: "Pizza Margherita",
            optionIds: ["normal"],
            price: EUR(700),
            listPrice: null,
            available: true,
            media: MARGHERITA_MEDIA,
            ingredients: [TOMATO, CHEESE],
          },
          expect.objectContaining({
            id: "margherita-gross",
            number: "21-groß",
            price: EUR(1000),
          }),
        ],
        selectedVariantId: "margherita-normal",
        extraGroups: [EXTRAS],
        upsell: true,
      });
    });

    it("starts with the first available variant", async () => {
      const catalog = await given(MENU);
      const bistecca = await catalog.getDish("bistecca");
      expect(bistecca.selectedVariantId).toBe("bistecca-pommes-durch");
      expect(bistecca.variantGroups.map((group) => group.name)).toEqual([
        "Beilage",
        "Garstufe",
      ]);
      expect(bistecca.variants).toHaveLength(4);
      expect(bistecca.extraGroups).toEqual([]);
    });

    it("answers the id of a variant with its dish and that variant selected", async () => {
      const catalog = await given(MENU);
      const detail = await catalog.getDish("margherita-gross");
      expect(detail).toMatchObject({
        id: "margherita",
        number: "21",
        selectedVariantId: "margherita-gross",
        extraGroups: [EXTRAS],
      });
    });

    it("answers a dish without variants with its extras", async () => {
      const catalog = await given(MENU);
      expect(await catalog.getDish("salami")).toMatchObject({
        id: "salami",
        variantGroups: [],
        variants: [],
        selectedVariantId: null,
        extraGroups: [EXTRAS],
        upsell: false,
      });
    });

    it("rejects an unknown dish with not_found", async () => {
      const catalog = await given(MENU);
      const error = await rejection(catalog.getDish("unbekannt"));
      expect(isDomainError(error, "not_found")).toBe(true);
    });

    it("finds a dish and a variant by menu number", async () => {
      const catalog = await given(MENU);
      expect(await catalog.findDishByNumber("3")).toMatchObject({
        id: "caprese",
        selectedVariantId: null,
      });
      expect(await catalog.findDishByNumber("21-groß")).toMatchObject({
        id: "margherita",
        selectedVariantId: "margherita-gross",
      });
      expect(await catalog.findDishByNumber("999")).toBeNull();
    });

    it("finds the variant with the chosen options", async () => {
      const catalog = await given(MENU);
      expect(await catalog.findVariant("margherita", ["gross"])).toEqual({
        id: "margherita-gross",
        number: "21-groß",
        name: "Pizza Margherita",
        optionIds: ["gross"],
        price: EUR(1000),
        listPrice: null,
        available: true,
        media: MARGHERITA_MEDIA,
        ingredients: [TOMATO, CHEESE],
      });
      expect(
        (await catalog.findVariant("bistecca", ["durch", "reis"]))?.id,
      ).toBe("bistecca-reis-durch");
    });

    it("takes the first variant that has a partial choice", async () => {
      const catalog = await given(MENU);
      expect((await catalog.findVariant("bistecca", ["reis"]))?.id).toBe(
        "bistecca-reis-medium",
      );
    });

    it("finds no variant for unknown options or dishes", async () => {
      const catalog = await given(MENU);
      expect(await catalog.findVariant("margherita", ["unbekannt"])).toBeNull();
      expect(await catalog.findVariant("unbekannt", ["gross"])).toBeNull();
    });

    it("lists the top sellers, at most the limit", async () => {
      const catalog = await given(MENU);
      expect(ids(await catalog.listTopSellers(8)).sort()).toEqual([
        "caprese",
        "salami",
      ]);
      expect(await catalog.listTopSellers(1)).toHaveLength(1);
    });

    it("suggests the marked dishes and the variants of a marked parent, by name", async () => {
      const catalog = await given(MENU);
      const upsell = await catalog.listUpsellDishes(6);
      expect(names(upsell)).toEqual([
        "Insalata verde",
        "Pizza Margherita",
        "Pizza Margherita",
      ]);
      expect(ids(upsell).sort()).toEqual([
        "margherita-gross",
        "margherita-normal",
        "verde",
      ]);
      expect(upsell.every((dish) => !dish.needsChoice && !dish.priceFrom)).toBe(
        true,
      );
      expect(
        upsell.find((dish) => dish.id === "margherita-gross"),
      ).toMatchObject({
        number: "21-groß",
        price: EUR(1000),
      });
      expect(await catalog.listUpsellDishes(1)).toHaveLength(1);
    });
  },
);
