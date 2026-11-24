import { describe, expect, it } from "vitest";
import { germanWords } from "../../support/germanText.mjs";
import { resolveShopLocale } from "../../../i18n/shopLocale";
import { createMemoryBackend } from "../../../server/adapters/memory";
import { demoSeed } from "../../../server/adapters/memory/seed";

/**
 * The demo restaurant's shop setup follows the shop's locale (ADR 0002);
 * its menu stays the quickstart's German menu.
 */
const english = () => demoSeed(resolveShopLocale({ locale: "en" }, {}));

describe("the memory demo restaurant in English", () => {
  it("names its shipping and payment methods in English", () => {
    const { checkout } = english();
    expect(checkout.shippingMethods.map((method) => method.name)).toEqual([
      "Delivery",
      "Pickup",
    ]);
    expect(checkout.paymentMethods?.map((method) => method.name)).toEqual([
      "Cash",
      "Card",
    ]);
  });

  it("has its menu at /Menu/ and English sortings and filters", () => {
    const { catalog } = english();
    expect(catalog.menuRoot?.path).toBe("/Menu/");
    expect(catalog.sections[0]?.path).toMatch(/^\/Menu\//);
    expect(
      [...catalog.sortings, ...catalog.searchSortings].flatMap((sorting) =>
        germanWords(sorting.label),
      ),
    ).toEqual([]);
    expect(catalog.dietFilters.vegetarian.name).toBe("Vegetarian");
  });

  it("links header and footer to the English pages", async () => {
    const { navigation } = createMemoryBackend(english());
    const footer = await navigation.getNavigation("footer");
    const links = footer.flatMap((column) =>
      column.children.map((node) => [node.label, node.path]),
    );
    expect(links).toContainEqual(["Contact", "/contact"]);
    expect(links).toContainEqual(["Favourites", "/favourites"]);
    expect(links).toContainEqual(["Terms", "/terms"]);
    expect(footer.map((column) => column.label)).toEqual([
      "Popular",
      "Service",
      "Legal",
    ]);
  });

  it("refuses an unknown voucher in English", async () => {
    const { cart } = createMemoryBackend(english());
    let state: string | undefined;
    const session = {
      read: async () => state,
      write: async (next: string | undefined) => {
        state = next;
      },
    };
    const refused = await cart.applyVoucher(session, "NOPE");
    const [message] = refused.messages;
    expect(message).toMatchObject({
      code: "voucher_invalid",
      subjectId: "NOPE",
    });
    expect(message?.text).toContain("NOPE");
    expect(germanWords(message?.text ?? "")).toEqual([]);
  });

  it("keeps the ids of the German setup", () => {
    const de = demoSeed();
    const en = english();
    expect(en.catalog.sections.map((section) => section.id)).toEqual(
      de.catalog.sections.map((section) => section.id),
    );
    expect(en.checkout.shippingMethods.map((method) => method.id)).toEqual(
      de.checkout.shippingMethods.map((method) => method.id),
    );
  });
});
