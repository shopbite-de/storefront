import { describe, expect, it } from "vitest";
import { hasPurgeSecret, keysToPurge } from "../../server/utils/cachePurge";

const PIZZA = "018dadb399837af3aa669c8fff4f4d6c";
const MARGHERITA = "0197baf0a6a971eaada59ed5c84138de";
const SCHNITZEL = "018dbccef8257618b0b3a541f513aa9e";
// keys as Nitro stores them (escaped custom key, see server/utils/cachePurge.ts)
const KEYS = [
  `cache:nitro:handlers:product:product${MARGHERITA}.json`,
  `cache:nitro:handlers:product:product${SCHNITZEL}.json`,
  `cache:nitro:handlers:variant:variant${MARGHERITA}a1b2.json`,
  `cache:nitro:handlers:cross-selling:crossselling${SCHNITZEL}.json`,
  `cache:nitro:handlers:category:category${PIZZA}.json`,
  `cache:nitro:handlers:listing:${PIZZA}1.json`,
  `cache:nitro:handlers:search:pizza1.json`,
  `cache:nitro:handlers:sitemap:urls.json`,
  `cache:nitro:routes:_:llmstxt.json`,
];

describe("keysToPurge", () => {
  it("purges every Store API cache without a target", () => {
    expect(keysToPurge(KEYS)).toEqual(
      KEYS.filter((k) => !k.includes("sitemap")),
    );
  });

  it("purges one product, its variants, all extras and all lists", () => {
    expect(keysToPurge(KEYS, { products: [MARGHERITA] })).toEqual([
      KEYS[0],
      KEYS[2],
      KEYS[3],
      KEYS[5],
      KEYS[6],
      KEYS[8],
    ]);
  });

  it("purges a category and the lists, not the products", () => {
    expect(keysToPurge(KEYS, { categories: [PIZZA] })).toEqual([
      KEYS[3],
      KEYS[4],
      KEYS[5],
      KEYS[6],
      KEYS[8],
    ]);
  });

  it("finds ids written with dashes or upper case", () => {
    const dashed = `0197BAF0-A6A9-71EA-ADA5-9ED5C84138DE`;
    expect(keysToPurge(KEYS, { products: [dashed] })).toContain(KEYS[0]);
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
