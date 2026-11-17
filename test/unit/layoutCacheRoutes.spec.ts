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
      (await import("../../server/utils/shopBiteConfig")) as {
        shopBiteConfig: CachedFunction<[], unknown>;
      };

    expect(shopBiteConfig.opts).toMatchObject({
      name: "shopbite-config",
      maxAge: 60,
      swr: false,
    });
    expect(await shopBiteConfig()).toEqual({ isCheckoutEnabled: true });
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

    expect(await menuRootId()).toBe("main-navigation");
    expect(await menuRootIdStrict()).toBe(ROOT);
  });

  it("rejects in the strict variant when the config fails", async () => {
    const stubs = stubNitro();
    stubs.storeApiGet!.mockRejectedValue(new Error("down"));
    const { menuRootIdStrict } = await import("../../server/utils/menuRoot");

    await expect(menuRootIdStrict()).rejects.toThrow("down");
  });
});

describe("SEO URL caches", () => {
  const loadCaches = async () =>
    (await import("../../server/utils/seoUrlCache")) as unknown as {
      findSeoUrl: CachedFunction<[string], unknown>;
      knownSeoPaths: CachedFunction<[], { paths: string[] | null }>;
    };

  it("keeps SEO URL matches only, one entry for all casings", async () => {
    stubNitro();
    const { findSeoUrl } = await loadCaches();

    expect(findSeoUrl.opts.validate?.({ value: null })).toBe(false);
    expect(findSeoUrl.opts.validate?.({ value: { foreignKey: "x" } })).toBe(
      true,
    );
    expect(findSeoUrl.opts.getKey("/C/Pizza/")).toBe(
      findSeoUrl.opts.getKey("/c/pizza/"),
    );
    expect(findSeoUrl.opts.getKey("/c/pizza")).not.toBe(
      findSeoUrl.opts.getKey("/c/pizza/"),
    );
    expect(findSeoUrl.opts.swr).toBe(false);
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
  });
});
