import { describe, expect, it } from "vitest";
import { createMemoryBackend } from "../../../server/adapters/memory";
import { money } from "../../../shared/domain";

/**
 * The memory adapter's demo menu is the quickstart's (setup/menu.json),
 * with the ids its setup gives the Shopware entities: a storefront on the
 * memory adapter shows the quickstart's sections under the same paths.
 */
describe("memory demo menu", () => {
  const { catalog } = createMemoryBackend();

  it("has the quickstart's sections with their paths and ids", async () => {
    const menu = await catalog.getMenu();
    expect(menu.map((section) => section.path)).toEqual([
      "/Speisekarte/Vorspeisen/",
      "/Speisekarte/Salate/",
      "/Speisekarte/Pizza/",
      "/Speisekarte/Nudeln/",
      "/Speisekarte/Fleischgerichte/",
      "/Speisekarte/Fisch/",
      "/Speisekarte/Extras-Beilagen/",
      "/Speisekarte/Nachtisch/",
      "/Speisekarte/Getraenke/",
    ]);
    // uuid5 of "category:pizza" in the setup's namespace
    expect(menu[2]).toMatchObject({
      id: "12eb9087c8335ca9a74cc6485fa36b34",
      name: "Pizza",
      icon: "i-lucide-pizza",
    });
  });

  it("has the pizzas with sizes, extras and sorted ingredients", async () => {
    const margherita = await catalog.findDishByNumber("SB-21");
    expect(margherita).toMatchObject({
      id: "ae0946785b4a53438dac2b8535eb4f9f",
      name: "Pizza Margherita",
      price: money(700, "EUR"),
      priceFrom: true,
      ingredients: [{ name: "Käse" }, { name: "Tomatensoße" }],
      diets: ["vegetarian"],
      media: { url: "/api/menu/media/21.webp", width: 320 },
      variantGroups: [
        {
          name: "Größe",
          options: [
            { id: "ba9ed37d192e51bca40ce03870e961b6", name: "Normal 30 cm" },
            { id: "92cc421067ca5cee84f2c2dada01ba1a", name: "Groß 40 cm" },
          ],
        },
      ],
      selectedVariantId: margherita?.variants[0]?.id,
    });
    expect(
      margherita?.variants.map((variant) => [
        variant.number,
        variant.price.amountMinor,
      ]),
    ).toEqual([
      ["SB-21-normal", 700],
      ["SB-21-groß", 1000],
    ]);
    expect(
      margherita?.extraGroups[0]?.extras.map((extra) => extra.number),
    ).toEqual([
      "EXTRA-900",
      "EXTRA-901",
      "EXTRA-902",
      "EXTRA-903",
      "EXTRA-904",
      "EXTRA-905",
      "EXTRA-906",
      "EXTRA-907",
    ]);
  });

  it("lists the dishes of a section by name with the diet filters", async () => {
    const listing = await catalog.listDishes(
      "12eb9087c8335ca9a74cc6485fa36b34",
    );
    expect(listing.total).toBe(14);
    expect(listing.dishes[0]?.name).toBe("Pizza Calzone");
    expect(listing.filters.map((filter) => filter.name)).toEqual([
      "Vegetarisch",
      "Vegan",
    ]);
  });

  it("marks a few top sellers and upsell dishes for the demo", async () => {
    expect(
      (await catalog.listTopSellers(8)).map((dish) => dish.number),
    ).toEqual(["SB-3", "SB-21", "SB-35"]);
    expect(
      (await catalog.listUpsellDishes(6)).map((dish) => dish.number),
    ).toEqual(["SB-12", "SB-200"]);
  });
});

/**
 * The quickstart's menu root, header and footer (its setup.py), so the
 * menu root page, sections, breadcrumbs and navigations render on the
 * memory adapter like on the quickstart's Shopware.
 */
describe("memory demo navigation", () => {
  const { catalog, navigation } = createMemoryBackend();
  const ROOT = "211cf9b2d1725130a517bbadf753a43c";
  const PIZZA = "12eb9087c8335ca9a74cc6485fa36b34";

  it("has the quickstart's menu root, whose page lists every dish", async () => {
    expect(await navigation.getMenuRootId()).toBe(ROOT);
    const root = await catalog.getSection(ROOT);
    expect(root).toMatchObject({ name: "Speisekarte", path: "/Speisekarte/" });
    expect(root.children).toHaveLength(9);
    const all = await catalog.listDishes(ROOT);
    expect(all.total).toBe((await catalog.listMenuDishes()).length);
    // the menu stays the sections below the root
    expect(await catalog.getMenu()).toHaveLength(9);
  });

  it("resolves the quickstart's paths and their other spellings", async () => {
    expect(await navigation.resolvePath("/Speisekarte/")).toEqual({
      kind: "menu-section",
      sectionId: ROOT,
      canonicalPath: "/Speisekarte/",
    });
    expect(await navigation.resolvePath("/speisekarte/pizza")).toEqual({
      kind: "redirect",
      to: "/Speisekarte/Pizza/",
      sectionId: PIZZA,
    });
    expect(await navigation.resolvePath("/Speisekarte/Unbekannt/")).toBeNull();
  });

  it("has the quickstart's header and footer", async () => {
    const main = await navigation.getNavigation("main");
    expect(main.map((entry) => [entry.label, entry.path])).toEqual([
      ["Speisekarte", "/Speisekarte/"],
      ["Kontakt", "/kontakt"],
    ]);
    expect(main[0]!.children).toHaveLength(9);
    const footer = await navigation.getNavigation("footer");
    expect(
      footer.map((column) => [
        column.label,
        column.children.map((entry) => entry.path),
      ]),
    ).toEqual([
      [
        "Beliebt",
        [
          "/Speisekarte/Vorspeisen/",
          "/Speisekarte/Salate/",
          "/Speisekarte/Pizza/",
          "/Speisekarte/Nudeln/",
        ],
      ],
      ["Service", ["/kontakt", "/zahlung-und-versand", "/konto", "/merkliste"]],
      ["Rechtliches", ["/impressum", "/datenschutz", "/agb"]],
    ]);
  });

  it("answers breadcrumbs from the menu root and the sitemap of all sections", async () => {
    expect(await navigation.getBreadcrumb(PIZZA)).toEqual([
      { label: "Speisekarte", path: "/Speisekarte/" },
      { label: "Pizza", path: "/Speisekarte/Pizza/" },
    ]);
    const sitemap = await navigation.listSitemapEntries();
    expect(sitemap.map((entry) => entry.path)).toEqual([
      "/Speisekarte/",
      ...(await catalog.getMenu()).map((section) => section.path),
    ]);
  });
});
