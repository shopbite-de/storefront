import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  stubNitro,
  type CachedFunction,
  type CachedHandler,
} from "./nitroStubs";

const ROOT = "018dadb399837af3aa669c8fff4f4d6c";
const SECTION = "0197baf0a6a971eaada59ed5c84138de";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)).default as T;

describe("/api/navigation/[type]", () => {
  it("keys and fetches the menu navigations by the menu root", async () => {
    const stubs = stubNitro({
      menuRootIdStrict: vi.fn().mockResolvedValue(ROOT),
    });
    stubs.storeApiPost!.mockResolvedValue([]);
    const { handler, opts } = await load<CachedHandler>(
      "../../server/api/navigation/[type].get",
    );

    expect(await opts.getKey({ params: { type: "menu" } })).toBe(
      `navigation-menu-${ROOT}`,
    );
    expect(await opts.getKey({ params: { type: "main" } })).toBe(
      "navigation-main-main-navigation",
    );
    await handler({ params: { type: "home" } });
    expect(stubs.storeApiPost).toHaveBeenCalledWith(
      `/navigation/main-navigation/${ROOT}`,
      expect.objectContaining({ depth: 1 }),
    );
  });

  it("resolves the menu root once for key and request", async () => {
    const strict = vi
      .fn()
      .mockResolvedValueOnce(ROOT)
      .mockResolvedValue("0".repeat(32));
    const stubs = stubNitro({ menuRootIdStrict: strict });
    stubs.storeApiPost!.mockResolvedValue([]);
    const { handler, opts } = await load<CachedHandler>(
      "../../server/api/navigation/[type].get",
    );
    const event = { params: { type: "menu" }, context: {} };

    expect(await opts.getKey(event)).toBe(`navigation-menu-${ROOT}`);
    await handler(event);
    expect(stubs.storeApiPost).toHaveBeenCalledWith(
      `/navigation/main-navigation/${ROOT}`,
      expect.anything(),
    );
  });

  it("caches nothing when the menu root cannot be resolved", async () => {
    stubNitro({
      menuRootIdStrict: vi.fn().mockRejectedValue(new Error("down")),
    });
    const { opts } = await load<CachedHandler>(
      "../../server/api/navigation/[type].get",
    );

    // a rejected key fails the request instead of caching the fallback root
    await expect(opts.getKey({ params: { type: "menu" } })).rejects.toThrow();
  });
});

describe("/api/breadcrumb/[categoryId]", () => {
  it("answers an unknown category with 404, so it is not cached", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockResolvedValue([]);
    const { handler } = await load<CachedHandler>(
      "../../server/api/breadcrumb/[categoryId].get",
    );

    await expect(
      handler({ params: { categoryId: SECTION } }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns the breadcrumb of a known category", async () => {
    const stubs = stubNitro();
    const crumbs = [{ name: "Pizza", path: "Speisekarte/Pizza/" }];
    stubs.storeApiGet!.mockResolvedValue(crumbs);
    const { handler } = await load<CachedHandler>(
      "../../server/api/breadcrumb/[categoryId].get",
    );

    expect(await handler({ params: { categoryId: SECTION } })).toEqual(crumbs);
  });
});

describe("time-critical layout data", () => {
  it("never serves business hours or holidays older than their TTL", async () => {
    stubNitro();
    for (const name of ["business-hours", "holidays"]) {
      vi.resetModules();
      const { opts } = await load<CachedHandler>(
        `../../server/api/shopbite/${name}.get`,
      );
      expect(opts.swr).toBe(false);
    }
  });

  it("keeps the plugin config for the config TTL, without stale answers", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockResolvedValue({ isCheckoutEnabled: true });
    const { shopBiteConfig } =
      await import("../../server/utils/shopBiteConfig");

    expect(stubs.defineCachedFunction!.mock.calls[0]![1]).toMatchObject({
      name: "shopbite-config",
      maxAge: 60,
      swr: false,
    });
    expect(await shopBiteConfig()).toEqual({ isCheckoutEnabled: true });
    expect(await shopBiteConfig()).toEqual({ isCheckoutEnabled: true });
    expect(stubs.storeApiGet).toHaveBeenCalledOnce();
    expect(stubs.storeApiGet).toHaveBeenCalledWith("/shopbite/config");
  });
});

describe("menuRootId", () => {
  it("falls back to the navigation root without caching the failure", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockRejectedValueOnce(new Error("down"));
    stubs.storeApiGet!.mockResolvedValueOnce({ menuCategoryId: ROOT });
    const { menuRootId, menuRootIdStrict } =
      await import("../../server/utils/menuRoot");

    vi.useFakeTimers();
    try {
      expect(await menuRootId()).toBe("main-navigation");
      // asked again after the pause, not answered with the fallback
      vi.advanceTimersByTime(31_000);
      expect(await menuRootIdStrict()).toBe(ROOT);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects in the strict variant when the config fails", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockRejectedValue(new Error("down"));
    const { menuRootIdStrict } = await import("../../server/utils/menuRoot");

    await expect(menuRootIdStrict()).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});

describe("SEO URL caches", () => {
  const loadCaches = async () =>
    (await import("../../server/utils/seoUrlCache")) as unknown as {
      findSeoUrl: CachedFunction<[string], unknown>;
      knownSeoPaths: CachedFunction<[], { paths: string[] | null }>;
    };

  const PIZZA = {
    seoPathInfo: "Speisekarte/Pizza/",
    foreignKey: SECTION,
    routeName: "frontend.navigation.page",
  };
  const NAVIGATION = {
    pathInfo: `/navigation/${SECTION}`,
    seoPathInfo: "Speisekarte/Pizza/",
    foreignKey: SECTION,
  };

  /** Shopware's lookup: case-, accent- and trailing-space-insensitive. */
  function stubShopwareSeoUrls() {
    const stubs = stubNitro();
    const loose = (value: string) =>
      value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/ +$/, "");
    stubs.storeApiPost!.mockImplementation(
      async (
        _path: string,
        criteria: { filter: { field: string; value: string }[] },
      ) => {
        const { field, value } = criteria.filter[0]!;
        if (
          field === "seoPathInfo" &&
          loose(value) === loose(PIZZA.seoPathInfo)
        )
          return { elements: [PIZZA] };
        if (field === "pathInfo" && loose(value) === loose(NAVIGATION.pathInfo))
          return { elements: [NAVIGATION] };
        return { elements: [] };
      },
    );
    return stubs;
  }

  it("keeps SEO URL matches, one entry for all casings of a path", async () => {
    const stubs = stubShopwareSeoUrls();
    const { findSeoUrl } = await loadCaches();

    expect(await findSeoUrl("/Speisekarte/Pizza/")).toEqual(PIZZA);
    expect(await findSeoUrl("/speisekarte/pizza/")).toEqual(PIZZA);
    expect(await findSeoUrl("/Speisekarte/Pizza/")).toEqual(PIZZA);
    expect(stubs.storeApiPost).toHaveBeenCalledTimes(1);
  });

  it("caches neither misses nor loose matches (accents, trailing spaces)", async () => {
    const stubs = stubShopwareSeoUrls();
    const { findSeoUrl } = await loadCaches();
    const variants = [
      "/Speisekarte/Pizza/ ",
      "/Speisekarte/Pizza/   ",
      "/Spéisekarte/Pizza/",
      "/Spêisekárte/Pizzà/",
    ];

    for (const round of [1, 2]) {
      for (const path of variants) {
        expect(await findSeoUrl(path), `${path} round ${round}`).toEqual(PIZZA);
      }
      expect(await findSeoUrl("/wp-admin/")).toBeNull();
    }
    expect(stubs.storeApiPost).toHaveBeenCalledTimes(2 * (variants.length + 1));
  });

  it("keys technical URLs apart from SEO paths of the same spelling", async () => {
    stubShopwareSeoUrls();
    const { findSeoUrl } = await loadCaches();

    expect(await findSeoUrl(`/navigation/${SECTION}`)).toEqual(NAVIGATION);
    // not a technical URL (case-sensitive prefix): a SEO path lookup
    expect(await findSeoUrl(`/Navigation/${SECTION}`)).toBeNull();
  });

  it("asks Shopware page by page with `page` for the known paths", async () => {
    const stubs = stubNitro();
    const page = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => ({ seoPathInfo: `${prefix}${i}/` }));
    stubs.storeApiPost!.mockImplementation(
      async (_path: string, criteria: { page: number; filter: unknown[] }) => {
        const canonical = JSON.stringify(criteria.filter).includes("true");
        if (!canonical) return { elements: [] };
        return {
          elements: page(criteria.page < 3 ? 100 : 5, `p${criteria.page}-`),
        };
      },
    );
    const { knownSeoPaths } = await loadCaches();

    const { paths } = await knownSeoPaths();
    expect(paths).toHaveLength(205);
    // stable order, so pages neither skip nor repeat rows
    for (const [, criteria] of stubs.storeApiPost!.mock.calls) {
      expect(criteria.sort).toEqual([{ field: "id", order: "ASC" }]);
    }
    expect(paths).toContain("p2-7");
    expect(knownSeoPaths.opts.swr).toBe(false);
  });

  it("keeps an answer for a list too long to filter by", async () => {
    const stubs = stubNitro();
    stubs.storeApiPost!.mockImplementation(async () => ({
      elements: Array.from({ length: 100 }, (_, i) => ({
        seoPathInfo: `${i}`,
      })),
    }));
    const { knownSeoPaths } = await loadCaches();

    // stored (a value, not undefined), so the next request does not page again
    expect(await knownSeoPaths()).toMatchObject({ paths: null });
    const calls = stubs.storeApiPost!.mock.calls.length;
    await knownSeoPaths();
    expect(stubs.storeApiPost!.mock.calls.length).toBe(calls);
  });
});

describe("/api/seo-url/known", () => {
  const ask = async (
    knownSeoPaths: ReturnType<typeof vi.fn>,
    paths: string[],
  ) => {
    stubNitro({ knownSeoPaths });
    const handler = await load<(event: unknown) => Promise<unknown>>(
      "../../server/api/seo-url/known.get",
    );
    const results = [];
    for (const path of paths) results.push(await handler({ query: { path } }));
    return results;
  };

  it("rejects paths no category had and lets known ones through", async () => {
    const known = vi
      .fn()
      .mockResolvedValue({ paths: ["speisekarte/pizza"], loadedAt: 1 });
    expect(await ask(known, ["/wp-admin/", "/Speisekarte/Pizza"])).toEqual([
      { known: false },
      { known: true },
    ]);
  });

  it("lets everything through for a list too long to filter by", async () => {
    const known = vi.fn().mockResolvedValue({ paths: null, loadedAt: 1 });
    expect(await ask(known, ["/wp-admin/"])).toEqual([{ known: true }]);
  });

  it("backs off after a failed load instead of asking on every request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const known = vi.fn().mockRejectedValue(new Error("down"));
    expect(await ask(known, ["/wp-admin/", "/.git/HEAD"])).toEqual([
      { known: true },
      { known: true },
    ]);
    expect(known).toHaveBeenCalledTimes(1);
  });
});

describe("plugin config during an outage", () => {
  const CONFIG = { menuCategoryId: ROOT, isCheckoutEnabled: true };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the last good config and asks again only after a pause", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockResolvedValueOnce(CONFIG);
    stubs.storeApiGet!.mockRejectedValue(new Error("down"));
    const { shopBiteConfig } =
      await import("../../server/utils/shopBiteConfig");

    expect(await shopBiteConfig()).toEqual(CONFIG);
    vi.setSystemTime(61_000); // cache entry expired
    expect(await shopBiteConfig()).toEqual(CONFIG);
    expect(await shopBiteConfig()).toEqual(CONFIG);
    expect(stubs.storeApiGet).toHaveBeenCalledTimes(2);

    vi.setSystemTime(92_000); // after the pause
    await shopBiteConfig();
    expect(stubs.storeApiGet).toHaveBeenCalledTimes(3);
  });

  it("without a good config fails fast during the pause", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockRejectedValue(new Error("down"));
    const { menuRootIdStrict } = await import("../../server/utils/menuRoot");

    await expect(menuRootIdStrict()).rejects.toThrow();
    await expect(menuRootIdStrict()).rejects.toThrow();
    expect(stubs.storeApiGet).toHaveBeenCalledTimes(1);
  });

  it("keeps the menu on the last good root", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockResolvedValueOnce(CONFIG);
    stubs.storeApiGet!.mockRejectedValue(new Error("down"));
    const { menuRootIdStrict } = await import("../../server/utils/menuRoot");

    expect(await menuRootIdStrict()).toBe(ROOT);
    vi.setSystemTime(61_000);
    expect(await menuRootIdStrict()).toBe(ROOT);
  });
});

describe("/api/_cache/purge", () => {
  async function purge(body: unknown) {
    const { keysToPurge, hasPurgeSecret } =
      await import("../../server/utils/cachePurge");
    const removeItem = vi.fn();
    stubNitro({
      useRuntimeConfig: () => ({ cachePurgeSecret: "s" }),
      getHeader: () => "Bearer s",
      readBody: async () => body,
      useStorage: () => ({
        getKeys: async () => [
          "cache:nitro:handlers:holidays:holidays.json",
          "cache:nitro:handlers:listing:x1.json",
        ],
        removeItem,
      }),
      keysToPurge,
      hasPurgeSecret,
    });
    const handler = await load<(event: unknown) => Promise<unknown>>(
      "../../server/api/_cache/purge.post",
    );
    return { result: handler({}), removeItem };
  }

  it("accepts a layout target", async () => {
    const { result, removeItem } = await purge({ layout: true });
    expect(await result).toEqual({ purged: 1 });
    expect(removeItem).toHaveBeenCalledWith(
      "cache:nitro:handlers:holidays:holidays.json",
    );
  });

  it("rejects a layout target that is not a boolean", async () => {
    const { result } = await purge({ layout: "yes" });
    await expect(result).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("cold caches during a Shopware outage", () => {
  const DOWN = Object.assign(new Error("503 Service Unavailable"), {
    statusCode: 503,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const HANDLERS: { path: string; params: Record<string, string> }[] = [
    {
      path: "../../server/api/navigation/[type].get",
      params: { type: "main" },
    },
    {
      path: "../../server/api/navigation/[type].get",
      params: { type: "menu" },
    },
    { path: "../../server/api/shopbite/business-hours.get", params: {} },
    { path: "../../server/api/shopbite/holidays.get", params: {} },
    { path: "../../server/api/payment-methods.get", params: {} },
    { path: "../../server/api/top-sellers.get", params: {} },
    {
      path: "../../server/api/breadcrumb/[categoryId].get",
      params: { categoryId: SECTION },
    },
  ];

  for (const { path, params } of HANDLERS) {
    it(`asks Shopware once per pause: ${path.split("/api/")[1]} ${JSON.stringify(params)}`, async () => {
      const stubs = stubNitro({
        menuRootIdStrict: vi.fn().mockResolvedValue(ROOT),
      });
      stubs.storeApiGet!.mockRejectedValue(DOWN);
      stubs.storeApiPost!.mockRejectedValue(DOWN);
      const { handler } = await load<CachedHandler>(path);
      const calls = () =>
        stubs.storeApiGet!.mock.calls.length +
        stubs.storeApiPost!.mock.calls.length;

      for (let i = 0; i < 3; i++) {
        await expect(handler({ params, context: {} })).rejects.toMatchObject({
          statusCode: 503,
        });
      }
      expect(calls()).toBe(1);

      vi.setSystemTime(31_000);
      await expect(handler({ params, context: {} })).rejects.toThrow();
      expect(calls()).toBe(2);
    });
  }

  it("serves the last good answer per key during an outage", async () => {
    const stubs = stubNitro();
    const hours = { businessHours: [{ dayOfWeek: 1 }] };
    stubs.storeApiGet!.mockResolvedValueOnce(hours).mockRejectedValue(DOWN);
    const { handler } = await load<CachedHandler>(
      "../../server/api/shopbite/business-hours.get",
    );

    expect(await handler({})).toEqual(hours);
    expect(await handler({})).toEqual(hours);
    expect(await handler({})).toEqual(hours);
    expect(stubs.storeApiGet).toHaveBeenCalledTimes(2);
  });

  it("does not take a client error for an outage", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockRejectedValue(
      Object.assign(new Error("400"), { statusCode: 400 }),
    );
    const { handler } = await load<CachedHandler>(
      "../../server/api/breadcrumb/[categoryId].get",
    );

    await expect(
      handler({ params: { categoryId: SECTION } }),
    ).rejects.toThrow();
    await expect(
      handler({ params: { categoryId: SECTION } }),
    ).rejects.toThrow();
    expect(stubs.storeApiGet).toHaveBeenCalledTimes(2);
  });
});

describe("storeApi", () => {
  it("does not retry: a failing request reaches Shopware once", async () => {
    const fetch = vi.fn().mockResolvedValue({});
    stubNitro({ $fetch: fetch });
    const { storeApiGet, storeApiPost } =
      await import("../../server/utils/storeApi");

    await storeApiGet("/shopbite/holiday");
    await storeApiPost("/seo-url", {});
    for (const [, options] of fetch.mock.calls) {
      expect(options.retry).toBe(0);
    }
  });
});

describe("/api/seo-url with hostile paths", () => {
  it("answers without a lookup", async () => {
    const findSeoUrl = vi.fn().mockResolvedValue(null);
    stubNitro({ findSeoUrl });
    const handler = await load<(event: unknown) => Promise<unknown>>(
      "../../server/api/seo-url/index.get",
    );

    expect(
      await handler({ query: { path: "/%c0%ae%c0%ae/etc/passwd" } }),
    ).toEqual({ seoUrl: null });
    expect(await handler({ query: { path: "/navigation/zzz" } })).toEqual({
      seoUrl: null,
    });
    expect(findSeoUrl).not.toHaveBeenCalled();
  });
});
