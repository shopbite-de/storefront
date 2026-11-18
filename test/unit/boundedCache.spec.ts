import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "unstorage";
import { stubNitro, type CachedHandler } from "./nitroStubs";

const CATEGORY = "018dadb399837af3aa669c8fff4f4d6c";
const A = "0197baf0a6a971eaada59ed5c84138de";
const B = "018dbccef8257618b0b3a541f513aa9e";

const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)).default as T;

async function route(path: string) {
  const params = await import("../../server/utils/listingParams");
  const stubs = stubNitro({ ...params, $fetch: vi.fn(), MEDIA_INCLUDES: {} });
  return { stubs, ...(await load<CachedHandler>(path)) };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const listingEvent = (query: Record<string, unknown>) => ({
  params: { categoryId: CATEGORY },
  query,
});

describe("/api/listing/[categoryId] cache key", () => {
  it("keys property and manufacturer filters as sorted lower-case ids", async () => {
    const { opts, handler, stubs } = await route(
      "../../server/api/listing/[categoryId].get",
    );
    const query = { properties: `${B.toUpperCase()}|${A}|${A}`, p: "2" };

    expect(await opts.getKey(listingEvent(query))).toBe(
      [CATEGORY, "", `${B}|${A}`, "", "", 2].join("|"),
    );
    await handler(listingEvent(query));
    expect(stubs.storeApiPost).toHaveBeenCalledWith(
      `/product-listing/${CATEGORY}`,
      expect.objectContaining({ properties: `${B}|${A}`, p: 2 }),
      expect.anything(),
    );
  });

  it.each([
    ["properties", "Käse"],
    ["properties", `${A}|`],
    ["properties", Array.from({ length: 51 }, () => A).join("|")],
    ["manufacturer", "x".repeat(32)],
    ["order", "random-key"],
    ["p", "21"],
    ["p", "0"],
    ["p", "1.5"],
    ["query", "x".repeat(101)],
    ["properties", [A, B]],
  ])("rejects %s=%s with 400 before it becomes a key", async (name, value) => {
    const { opts, handler, stubs } = await route(
      "../../server/api/listing/[categoryId].get",
    );
    const event = listingEvent({ [name]: value });

    expect(() => opts.getKey(event)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 });
    expect(stubs.storeApiPost).not.toHaveBeenCalled();
  });

  it("rejects a category id that is not 32 hex characters", async () => {
    const { opts } = await route("../../server/api/listing/[categoryId].get");

    expect(() =>
      opts.getKey({ params: { categoryId: "pizza" }, query: {} }),
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it("accepts Shopware's standard sortings", async () => {
    const { opts } = await route("../../server/api/listing/[categoryId].get");

    for (const order of ["name-asc", "name-desc", "price-asc", "topseller"]) {
      expect(await opts.getKey(listingEvent({ order }))).toContain(order);
    }
  });

  it("accepts the sortings configured for the shop", async () => {
    const params = await import("../../server/utils/listingParams");
    stubNitro({
      ...params,
      MEDIA_INCLUDES: {},
      useRuntimeConfig: () => ({
        listingSortings: "name-asc, menu-number",
        public: { shopBite: { cacheTtl: { listing: 1 } } },
      }),
    });
    const { opts } = await load<CachedHandler>(
      "../../server/api/listing/[categoryId].get",
    );

    expect(await opts.getKey(listingEvent({ order: "menu-number" }))).toContain(
      "menu-number",
    );
    expect(() => opts.getKey(listingEvent({ order: "price-asc" }))).toThrow();
  });

  it("normalises whitespace of the text query", async () => {
    const { opts } = await route("../../server/api/listing/[categoryId].get");

    expect(
      await opts.getKey(listingEvent({ query: "  Pizza   Salami " })),
    ).toBe([CATEGORY, "", "", "", "Pizza Salami", 1].join("|"));
  });
});

describe("/api/search cache key", () => {
  it.each([
    [{ query: "x".repeat(101) }],
    [{ query: "pizza", order: "x" }],
    [{ query: "pizza", p: "99" }],
    [{ query: ["pizza", "salami"] }],
  ])("rejects %o with 400", async (query) => {
    const { opts, handler, stubs } = await route("../../server/api/search.get");

    expect(() => opts.getKey({ query })).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
    await expect(handler({ query })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(stubs.$fetch).not.toHaveBeenCalled();
  });

  it("keys a valid search", async () => {
    const { opts } = await route("../../server/api/search.get");

    expect(
      await opts.getKey({ query: { query: " pizza ", order: "score" } }),
    ).toBe("pizza|score|1");
  });
});

describe("bounded cache storage", () => {
  async function mountWith(
    config: Record<string, unknown>,
    storage = createStorage(),
  ) {
    vi.stubGlobal("defineNitroPlugin", (plugin: unknown) => plugin);
    vi.stubGlobal("useRuntimeConfig", () => ({ cacheStorage: config }));
    vi.stubGlobal("useStorage", () => storage);
    const plugin = await load<() => void>("../../server/plugins/bounded-cache");
    plugin();
    return storage;
  }

  it("keeps at most maxEntries cache entries", async () => {
    const storage = await mountWith({ maxEntries: 3, maxSizeMb: 1 });

    for (const n of [1, 2, 3, 4, 5]) {
      await storage.setItem(`cache:nitro:handlers:search:q${n}.json`, {
        value: n,
      });
    }

    expect(await storage.getKeys("cache:nitro")).toHaveLength(3);
    expect(await storage.getItem("cache:nitro:handlers:search:q1.json")).toBe(
      null,
    );
    expect(
      await storage.getItem("cache:nitro:handlers:search:q5.json"),
    ).toEqual({ value: 5 });
    // other mounts are not affected
    await storage.setItem("data:x", 1);
    expect(await storage.getItem("data:x")).toBe(1);
  });

  it("keeps at most maxSizeMb of cache data", async () => {
    const storage = await mountWith({ maxEntries: 1000, maxSizeMb: 1 });
    const big = "x".repeat(400_000);

    for (const n of [1, 2, 3, 4]) {
      await storage.setItem(`cache:nitro:handlers:listing:l${n}.json`, big);
    }

    expect((await storage.getKeys("cache:nitro")).length).toBeLessThanOrEqual(
      2,
    );
  });

  it("leaves a cache storage the shop mounted itself", async () => {
    const own = createStorage();
    const { default: memory } = await import("unstorage/drivers/memory");
    own.mount("cache", memory());
    const driver = own.getMount("cache:").driver;

    await mountWith({ maxEntries: 3, maxSizeMb: 1 }, own);

    expect(own.getMount("cache:").driver).toBe(driver);
  });

  it("is off with maxEntries 0", async () => {
    const storage = await mountWith({ maxEntries: 0, maxSizeMb: 1 });

    expect(storage.getMount("cache:").base).toBe("");
  });

  it("still lets the purge find and remove the entries", async () => {
    const storage = await mountWith({ maxEntries: 100, maxSizeMb: 1 });
    const { keysToPurge } = await import("../../server/utils/cachePurge");
    await storage.setItem(`cache:nitro:handlers:product:product${A}.json`, {
      value: 1,
    });
    await storage.setItem(`cache:nitro:handlers:product:product${B}.json`, {
      value: 2,
    });
    await storage.setItem(`cache:nitro:handlers:listing:${CATEGORY}1.json`, {
      value: 3,
    });

    const keys = keysToPurge(await storage.getKeys("cache:nitro"), {
      products: [A],
    });
    await Promise.all(keys.map((key) => storage.removeItem(key)));

    expect(await storage.getKeys("cache:nitro")).toEqual([
      `cache:nitro:handlers:product:product${B}.json`,
    ]);
  });
});
