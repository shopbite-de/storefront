import { describe, expect, it } from "vitest";
import { hasPurgeSecret, keysToPurge } from "../../server/utils/cachePurge";

const PIZZA = "018dadb399837af3aa669c8fff4f4d6c";
const MARGHERITA = "0197baf0a6a971eaada59ed5c84138de";
const SCHNITZEL = "018dbccef8257618b0b3a541f513aa9e";
// keys as Nitro stores them (escaped custom key, see server/utils/cachePurge.ts)
const KEYS = [
  `cache:nitro:handlers:dish:dish${MARGHERITA}.json`,
  `cache:nitro:handlers:dish:dish${SCHNITZEL}.json`,
  `cache:nitro:handlers:variant:variant${MARGHERITA}a1b2.json`,
  `cache:nitro:handlers:variant:variant${SCHNITZEL}c3d4.json`,
  `cache:nitro:handlers:menu-section:section${PIZZA}.json`,
  `cache:nitro:handlers:listing:${PIZZA}1.json`,
  `cache:nitro:handlers:search:pizza1.json`,
  `cache:nitro:handlers:sitemap:urls.json`,
  `cache:nitro:routes:_:llmstxt.json`,
  `cache:nitro:handlers:dish-number:numbersb21.json`,
  `cache:nitro:handlers:upsell:upsell.json`,
];
// layout data of every page, purged with any target
const LAYOUT_KEYS = [
  `cache:nitro:handlers:navigation:navigationmenu${PIZZA}.json`,
  `cache:nitro:handlers:navigation:navigationmain.json`,
  `cache:nitro:handlers:breadcrumb:breadcrumb${PIZZA}.json`,
  `cache:nitro:handlers:payment-methods:paymentmethods.json`,
  `cache:nitro:handlers:top-sellers:topsellers.json`,
  // navigation and routing behind the BFF (server/utils/pathRoutes.ts,
  // server/utils/navigationData.ts)
  `cache:nitro:functions:path-route:3f786850e387550fdab836ed7e6dc881de23001b.json`,
  `cache:nitro:functions:known-paths:known-paths.json`,
  `cache:nitro:functions:menu-root:menu-root.json`,
  // restaurant operations behind the BFF (server/utils/shopData.ts)
  `cache:nitro:functions:shop-config:shop-config.json`,
  `cache:nitro:functions:shop-opening-hours:shop-opening-hours.json`,
  `cache:nitro:functions:shop-holidays:shop-holidays.json`,
  `cache:nitro:functions:shop-branches:shop-branches.json`,
  `cache:nitro:functions:shipping-methods:shipping-methods.json`,
];
const OTHER_FUNCTION = `cache:nitro:functions:_:abc.json`;

describe("keysToPurge", () => {
  it("purges every menu cache without a target", () => {
    expect(keysToPurge(KEYS)).toEqual(
      KEYS.filter((k) => !k.includes("sitemap")),
    );
  });

  it("purges one dish's variants, every dish sheet and all lists", () => {
    // dish sheets carry their extras, which any product change can reach
    expect(keysToPurge(KEYS, { products: [MARGHERITA] })).toEqual([
      KEYS[0],
      KEYS[1],
      KEYS[2],
      KEYS[4],
      KEYS[5],
      KEYS[6],
      KEYS[8],
      KEYS[9],
      KEYS[10],
    ]);
  });

  it("purges every section with any menu target, as a parent groups by its sub-sections", () => {
    const other = `cache:nitro:handlers:menu-section:section${MARGHERITA}.json`;
    expect(keysToPurge([...KEYS, other], { categories: [PIZZA] })).toContain(
      other,
    );
    expect(keysToPurge([...KEYS, other], { products: [SCHNITZEL] })).toContain(
      other,
    );
  });

  it("purges a section and the lists, not the variants", () => {
    expect(keysToPurge(KEYS, { categories: [PIZZA] })).toEqual([
      KEYS[0],
      KEYS[1],
      KEYS[4],
      KEYS[5],
      KEYS[6],
      KEYS[8],
      KEYS[9],
      KEYS[10],
    ]);
  });

  it("purges the layout data with every target", () => {
    const keys = [...KEYS, ...LAYOUT_KEYS, OTHER_FUNCTION];
    for (const target of [
      {},
      { products: [MARGHERITA] },
      { categories: [PIZZA] },
    ]) {
      const purged = keysToPurge(keys, target);
      expect(purged).toEqual(expect.arrayContaining(LAYOUT_KEYS));
      expect(purged).not.toContain(OTHER_FUNCTION);
    }
  });

  it("purges only the layout data and llms.txt for a layout target", () => {
    const keys = [...KEYS, ...LAYOUT_KEYS, OTHER_FUNCTION];
    const layout = LAYOUT_KEYS.filter((k) => !k.includes("top-sellers"));
    expect(keysToPurge(keys, { layout: true })).toEqual([KEYS[8], ...layout]);
  });

  it("adds the layout data to a menu target, not other dishes' variants", () => {
    const keys = [...KEYS, ...LAYOUT_KEYS];
    const purged = keysToPurge(keys, { products: [SCHNITZEL], layout: true });
    expect(purged).toEqual(expect.arrayContaining(LAYOUT_KEYS));
    expect(purged).toContain(KEYS[3]);
    expect(purged).not.toContain(KEYS[2]);
  });

  it("finds ids written with dashes or upper case", () => {
    const dashed = `0197BAF0-A6A9-71EA-ADA5-9ED5C84138DE`;
    expect(keysToPurge(KEYS, { products: [dashed] })).toContain(KEYS[2]);
  });
});

describe("hasPurgeSecret", () => {
  it("accepts only the exact bearer secret", () => {
    expect(hasPurgeSecret("Bearer geheim", "geheim")).toBe(true);
    expect(hasPurgeSecret("Bearer geheim2", "geheim")).toBe(false);
    expect(hasPurgeSecret("geheim", "geheim")).toBe(false);
    expect(hasPurgeSecret(undefined, "geheim")).toBe(false);
  });

  it("is off without a configured secret", () => {
    expect(hasPurgeSecret("Bearer ", "")).toBe(false);
  });
});
