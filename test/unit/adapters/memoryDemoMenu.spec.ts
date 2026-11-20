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
