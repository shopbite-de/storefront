import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "../../server/adapters/shopware";
import type { Backend, NavigationPort } from "../../server/ports";
import { NAVIGATION_SCENARIO } from "../contract/navigation.contract";
import { shopwareNavigationFake } from "../contract/navigationFixtures";
import {
  CACHE_TTL,
  stubNitro,
  type CachedFunction,
  type CachedHandler,
} from "./nitroStubs";

/**
 * Navigation and routing behind the BFF (ADR 0001, step 3): the routes
 * answer domain types from `useBackend().navigation`; navigations,
 * breadcrumbs, the menu root, path routes and the known paths are cached
 * with the guarantees of the layout caches (bounded, hostile paths without
 * a lookup, backoff during an outage).
 */
const ROOT = NAVIGATION_SCENARIO.menuRoot.id;
const PIZZA = "0a000000000000000000000000000002";
const FISCH = "0a000000000000000000000000000004";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DOWN = Object.assign(new Error("503 Service Unavailable"), {
  name: "FetchError",
  statusCode: 503,
});

/**
 * The Shopware adapter over the fake Store API of the contract suite, so
 * the routes run against the real anti-corruption layer; `lookups` counts
 * the SEO URL lookups (`limit: 1`), `requests` every Store API request.
 */
async function shopware(
  wrap: (storeApi: StoreApi) => StoreApi = (storeApi) => storeApi,
) {
  const { createShopwareBackend } =
    await import("../../server/adapters/shopware");
  const fake = shopwareNavigationFake(NAVIGATION_SCENARIO);
  const post = vi.fn(fake.storeApi.post);
  const get = vi.fn(fake.storeApi.get);
  const backend = createShopwareBackend({
    storeApi: wrap({
      get: get as StoreApi["get"],
      post: post as StoreApi["post"],
    }),
    storeUrl: "",
    timeZone: "Europe/Berlin",
    log: () => {},
  });
  const lookups = () =>
    post.mock.calls.filter(
      ([path, body]) =>
        path === "/seo-url" && (body as { limit?: number }).limit === 1,
    ).length;
  return { backend, post, get, lookups, requests: fake.requests };
}

/** A backend whose navigation port methods are replaced. */
async function withNavigation(
  methods: Partial<NavigationPort>,
): Promise<Backend> {
  const { backend } = await shopware();
  return {
    ...backend,
    navigation: { ...backend.navigation, ...methods },
  };
}

async function route<T = CachedHandler>(
  path: string,
  backend: Backend,
  globals: Record<string, unknown> = {},
) {
  const params = await import("../../server/utils/listingParams");
  const stubs = stubNitro({
    ...params,
    useBackend: () => backend,
    ...globals,
  });
  const loaded = (await import(/* @vite-ignore */ path)).default as T;
  return { loaded, stubs };
}

describe("/api/navigation/[kind]", () => {
  const PATH = "../../server/api/navigation/[kind].get";

  it("answers the port's navigation, keyed by kind and menu root", async () => {
    const { backend } = await shopware();
    const { loaded } = await route(PATH, backend);
    const { handler, opts } = loaded;

    expect(await handler({ params: { kind: "main" } })).toEqual(
      NAVIGATION_SCENARIO.main,
    );
    expect(opts).toMatchObject({
      name: "navigation",
      maxAge: CACHE_TTL.navigation,
    });
    expect(await opts.getKey({ params: { kind: "main" } })).toBe(
      "navigation-main",
    );
    expect(await opts.getKey({ params: { kind: "footer" } })).toBe(
      "navigation-footer",
    );
    expect(await opts.getKey({ params: { kind: "menu" } })).toBe(
      `navigation-menu-${ROOT}`,
    );
    expect(await opts.getKey({ params: { kind: "home" } })).toBe(
      `navigation-home-${ROOT}`,
    );
  });

  it("resolves the menu root once for key and request", async () => {
    const getMenuRootId = vi
      .fn()
      .mockResolvedValueOnce(ROOT)
      .mockResolvedValue("0".repeat(32));
    const backend = await withNavigation({ getMenuRootId });
    const { loaded } = await route(PATH, backend);
    const event = { params: { kind: "menu" }, context: {} };

    expect(await loaded.opts.getKey(event)).toBe(`navigation-menu-${ROOT}`);
    await loaded.handler(event);
    expect(getMenuRootId).toHaveBeenCalledOnce();
  });

  it("caches nothing when the menu root cannot be resolved", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const backend = await withNavigation({
      getMenuRootId: () => Promise.reject(DOWN),
    });
    const { loaded } = await route(PATH, backend);

    // a rejected key fails the request instead of caching a guessed root
    await expect(
      loaded.opts.getKey({ params: { kind: "menu" } }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("answers an unknown kind with 404 without asking the backend", async () => {
    const getNavigation = vi.fn();
    const backend = await withNavigation({ getNavigation });
    const { loaded } = await route(PATH, backend);

    await expect(
      loaded.handler({ params: { kind: "sidebar" } }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(getNavigation).not.toHaveBeenCalled();
  });

  it("answers a navigation the backend does not have with its code", async () => {
    const { DomainError } = await import("../../shared/domain");
    const backend = await withNavigation({
      getNavigation: () => Promise.reject(new DomainError("not_found", "x")),
    });
    const { loaded } = await route(PATH, backend);

    await expect(
      loaded.handler({ params: { kind: "footer" } }),
    ).rejects.toMatchObject({ statusCode: 404, data: { code: "not_found" } });
  });

  for (const kind of ["main", "menu"]) {
    it(`asks the backend once per pause during an outage (${kind})`, async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { backend, post } = await shopware((storeApi) => ({
        ...storeApi,
        post: () => Promise.reject(DOWN),
      }));
      const getNavigation = vi.spyOn(backend.navigation, "getNavigation");
      const { loaded } = await route(PATH, backend);

      for (let i = 0; i < 3; i++) {
        await expect(
          loaded.handler({ params: { kind }, context: {} }),
        ).rejects.toMatchObject({ statusCode: 503 });
      }
      expect(getNavigation).toHaveBeenCalledOnce();
      vi.setSystemTime(31_000);
      await expect(
        loaded.handler({ params: { kind }, context: {} }),
      ).rejects.toThrow();
      expect(getNavigation).toHaveBeenCalledTimes(2);
      expect(post).not.toHaveBeenCalled();
    });
  }
});

describe("/api/breadcrumb/[sectionId]", () => {
  const PATH = "../../server/api/breadcrumb/[sectionId].get";

  it("answers the breadcrumb, keyed by the section id", async () => {
    const { backend } = await shopware();
    const { loaded } = await route(PATH, backend);
    const event = { params: { sectionId: PIZZA.toUpperCase() } };

    expect(await loaded.handler(event)).toEqual([
      { label: "Speisekarte", path: "/Speisekarte/" },
      { label: "Pizza", path: "/Speisekarte/Pizza/" },
    ]);
    expect(loaded.opts).toMatchObject({
      name: "breadcrumb",
      maxAge: CACHE_TTL.category,
    });
    expect(await loaded.opts.getKey(event)).toBe(`breadcrumb-${PIZZA}`);
  });

  it("answers an unknown section with 404, so it is not cached", async () => {
    const { backend } = await shopware();
    const { loaded } = await route(PATH, backend);

    await expect(
      loaded.handler({ params: { sectionId: "f".repeat(32) } }),
    ).rejects.toMatchObject({ statusCode: 404, data: { code: "not_found" } });
  });

  it("rejects an id that is none before it becomes a key", async () => {
    const { backend } = await shopware();
    const { loaded } = await route(PATH, backend);

    for (const sectionId of ["a/b", "x".repeat(65), ""]) {
      expect(() => loaded.opts.getKey({ params: { sectionId } })).toThrow();
      await expect(
        loaded.handler({ params: { sectionId } }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
  });

  it("asks the backend once per pause during an outage", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { backend, get } = await shopware((storeApi) => ({
      ...storeApi,
      get: () => Promise.reject(DOWN),
    }));
    void get;
    const getBreadcrumb = vi.spyOn(backend.navigation, "getBreadcrumb");
    const { loaded } = await route(PATH, backend);
    const event = { params: { sectionId: PIZZA } };

    for (let i = 0; i < 3; i++) {
      await expect(loaded.handler(event)).rejects.toMatchObject({
        statusCode: 503,
      });
    }
    expect(getBreadcrumb).toHaveBeenCalledOnce();
  });
});

describe("/api/resolve-path", () => {
  const PATH = "../../server/api/resolve-path.get";
  type Handler = (event: { query?: Record<string, unknown> }) => Promise<{
    route: unknown;
  }>;

  async function resolver(backend?: Backend) {
    const setup = backend ? { backend } : await shopware();
    const { loaded, stubs } = await route<Handler>(PATH, setup.backend);
    const resolve = async (path: string) =>
      (await loaded({ query: { path } })).route;
    return { ...setup, resolve, stubs } as Awaited<
      ReturnType<typeof shopware>
    > & { resolve: typeof resolve; stubs: typeof stubs };
  }

  it("rejects a missing or relative path", async () => {
    const { backend } = await shopware();
    const { loaded } = await route<Handler>(PATH, backend);
    await expect(loaded({ query: {} })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      loaded({ query: { path: "Speisekarte/" } }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("answers a section, or a redirect for another spelling", async () => {
    const { resolve } = await resolver();
    expect(await resolve("/Speisekarte/Pizza/")).toEqual({
      kind: "menu-section",
      sectionId: PIZZA,
      canonicalPath: "/Speisekarte/Pizza/",
    });
    expect(await resolve("/speisekarte/pizza")).toEqual({
      kind: "redirect",
      to: "/Speisekarte/Pizza/",
      sectionId: PIZZA,
    });
    expect(await resolve("/Speisekarte/Fisch/")).toEqual({
      kind: "redirect",
      to: "/Speisekarte/Fischgerichte/",
      sectionId: FISCH,
    });
  });

  it("keeps one entry for all casings of a path", async () => {
    const { resolve, lookups } = await resolver();

    expect(await resolve("/speisekarte/pizza/")).toMatchObject({
      kind: "redirect",
    });
    expect(await resolve("/Speisekarte/Pizza/")).toMatchObject({
      kind: "menu-section",
      canonicalPath: "/Speisekarte/Pizza/",
    });
    expect(await resolve("/SPEISEKARTE/PIZZA/")).toMatchObject({
      kind: "redirect",
      to: "/Speisekarte/Pizza/",
    });
    expect(lookups()).toBe(1);
    // the toggled slash is one more entry per path, not one per spelling
    await resolve("/Speisekarte/Pizza");
    await resolve("/speisekarte/PIZZA");
    expect(lookups()).toBe(3);
  });

  it("keeps technical URLs apart from SEO paths of the same spelling", async () => {
    const { resolve, lookups } = await resolver();

    expect(await resolve(`/navigation/${PIZZA}`)).toEqual({
      kind: "redirect",
      to: "/Speisekarte/Pizza/",
      sectionId: PIZZA,
    });
    expect(await resolve(`/navigation/${PIZZA.toUpperCase()}`)).toMatchObject({
      kind: "redirect",
    });
    expect(lookups()).toBe(1);
    // not a technical URL (case-sensitive prefix): no section has the path
    expect(await resolve(`/Navigation/${PIZZA}`)).toBeNull();
    expect(lookups()).toBe(1);
  });

  it("asks again for former paths, misses and loose spellings", async () => {
    const resolvePath = vi.fn(async (path: string) =>
      path === "/Spéisekarte/Pizza/"
        ? ({
            kind: "redirect",
            to: "/Speisekarte/Pizza/",
            sectionId: PIZZA,
          } as const)
        : null,
    );
    const { resolve } = await resolver(await withNavigation({ resolvePath }));

    for (let round = 0; round < 2; round++) {
      // Shopware's collation ignores accents: each spelling would add an entry
      await resolve("/Spéisekarte/Pizza/");
      // a path the filter lets through (not ASCII) that has no section
      await resolve("/Speisekarte/%C3%B8l/");
    }
    expect(resolvePath).toHaveBeenCalledTimes(4);

    const { resolve: viaShopware, lookups } = await resolver();
    await viaShopware("/Speisekarte/Fisch/");
    const perRequest = lookups();
    await viaShopware("/Speisekarte/Fisch/");
    expect(lookups()).toBe(2 * perRequest);
  });

  it("answers a path no section ever had without a lookup", async () => {
    const { resolve, lookups, requests } = await resolver();
    for (const path of [
      "/wp-admin/",
      "/.git/HEAD",
      "/Speisekarte/Unbekannt/",
    ]) {
      expect(await resolve(path), path).toBeNull();
    }
    expect(lookups()).toBe(0);
    // one load of the known paths (current and former), cached
    expect(
      requests.filter((request) => request === "POST /seo-url"),
    ).toHaveLength(2);
  });

  it("answers hostile paths without any backend request", async () => {
    const { resolve, requests } = await resolver();
    for (const path of [
      "/%c0%ae%c0%ae/etc/passwd",
      "/%252e%252e/etc/passwd",
      "/%ff",
      `/${"a".repeat(800)}`,
    ]) {
      expect(await resolve(path), path).toBeNull();
    }
    expect(requests).toEqual([]);
  });

  it("answers technical prefixes without an id without a lookup", async () => {
    const { resolve, lookups } = await resolver();
    for (const path of ["/navigation/zzz", "/detail/abc", "/landingPage/x"]) {
      expect(await resolve(path), path).toBeNull();
    }
    expect(lookups()).toBe(0);
  });

  it("lets every path through for a list too long to filter by", async () => {
    const resolvePath = vi.fn(async () => null);
    const backend = await withNavigation({
      resolvePath,
      listKnownPaths: async () => null,
    });
    const { resolve } = await resolver(backend);

    expect(await resolve("/wp-admin/")).toBeNull();
    expect(resolvePath).toHaveBeenCalledOnce();
    // hostile paths stay rejected
    expect(await resolve("/%ff")).toBeNull();
    expect(resolvePath).toHaveBeenCalledOnce();
  });

  it("backs off after a failed load of the known paths", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const listKnownPaths = vi.fn(() => Promise.reject(DOWN));
    const resolvePath = vi.fn(async () => null);
    const { resolve } = await resolver(
      await withNavigation({ listKnownPaths, resolvePath }),
    );

    await resolve("/wp-admin/");
    await resolve("/.git/HEAD");
    expect(listKnownPaths).toHaveBeenCalledOnce();
    expect(resolvePath).toHaveBeenCalledTimes(2);
    // hostile paths stay rejected during the backoff
    await resolve("/%252e%252e/etc/passwd");
    expect(resolvePath).toHaveBeenCalledTimes(2);
  });

  it("caches the known paths for the SEO URL TTL, without stale answers", async () => {
    const { resolve, stubs } = await resolver();
    await resolve("/Speisekarte/Pizza/");
    const names = stubs.defineCachedFunction!.mock.results.map(
      (result) => (result.value as CachedFunction<[], unknown>).opts,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "known-paths",
          maxAge: CACHE_TTL.seoUrl,
          swr: false,
        }),
        expect.objectContaining({
          name: "path-route",
          maxAge: CACHE_TTL.seoUrl,
          swr: false,
        }),
      ]),
    );
  });

  it("fails fast during an outage of the lookups", async () => {
    const resolvePath = vi.fn(() => Promise.reject(DOWN));
    const { resolve } = await resolver(await withNavigation({ resolvePath }));

    for (let i = 0; i < 3; i++) {
      await expect(resolve("/Speisekarte/Pizza/")).rejects.toMatchObject({
        statusCode: 503,
      });
    }
    expect(resolvePath).toHaveBeenCalledOnce();
  });
});

describe("/api/menu/root", () => {
  const PATH = "../../server/api/menu/root.get";
  type Handler = (event: unknown) => Promise<unknown>;

  it("answers the menu root, cached for the config TTL", async () => {
    const getMenuRootId = vi.fn(async () => ROOT);
    const { loaded, stubs } = await route<Handler>(
      PATH,
      await withNavigation({ getMenuRootId }),
    );

    expect(await loaded({})).toEqual({ id: ROOT });
    expect(await loaded({})).toEqual({ id: ROOT });
    expect(getMenuRootId).toHaveBeenCalledOnce();
    const opts = stubs
      .defineCachedFunction!.mock.results.map(
        (result) => (result.value as CachedFunction<[], unknown>).opts,
      )
      .find((entry) => entry.name === "menu-root");
    expect(opts).toMatchObject({ maxAge: CACHE_TTL.config, swr: false });
  });

  it("keeps the last good root during an outage and asks again after a pause", async () => {
    const getMenuRootId = vi
      .fn()
      .mockResolvedValueOnce(ROOT)
      .mockRejectedValue(DOWN);
    const { loaded } = await route<Handler>(
      PATH,
      await withNavigation({ getMenuRootId }),
    );

    expect(await loaded({})).toEqual({ id: ROOT });
    vi.setSystemTime(61_000); // cache entry expired
    expect(await loaded({})).toEqual({ id: ROOT });
    expect(await loaded({})).toEqual({ id: ROOT });
    expect(getMenuRootId).toHaveBeenCalledTimes(2);
    vi.setSystemTime(92_000);
    await loaded({});
    expect(getMenuRootId).toHaveBeenCalledTimes(3);
  });

  it("without a good root fails fast with 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const getMenuRootId = vi.fn(() => Promise.reject(DOWN));
    const { loaded } = await route<Handler>(
      PATH,
      await withNavigation({ getMenuRootId }),
    );

    await expect(loaded({})).rejects.toMatchObject({ statusCode: 503 });
    await expect(loaded({})).rejects.toMatchObject({ statusCode: 503 });
    expect(getMenuRootId).toHaveBeenCalledOnce();
  });
});

describe("/api/__sitemap__/urls", () => {
  const PATH = "../../server/api/__sitemap__/urls.get";
  type Handler = (event: unknown) => Promise<unknown>;

  it("lists the contact page and the sections with slash markers", async () => {
    const { backend } = await shopware();
    const { loaded } = await route<Handler>(PATH, backend, {
      defineSitemapEventHandler: (handler: unknown) => handler,
      useRuntimeConfig: () => ({
        public: {
          shopBite: {
            cacheTtl: CACHE_TTL,
            feature: { contactForm: true },
          },
        },
      }),
    });

    const urls = (await loaded({})) as unknown[];
    expect(urls[0]).toBe("/kontakt");
    expect(urls).toContainEqual({
      loc: "/Speisekarte/Pizza/",
      lastmod: NAVIGATION_SCENARIO.lastModified[PIZZA],
      images: [{ loc: "https://cdn.example.com/pizza.webp" }],
      _trailingSlash: true,
    });
    expect(urls).toHaveLength(5);
  });
});

describe("cache purge", () => {
  it("empties the cached navigation data with the layout", async () => {
    const { LAYOUT, LAYOUT_FUNCTIONS } =
      await import("../../server/utils/cachePurge");
    expect(LAYOUT).toEqual(
      expect.arrayContaining(["navigation", "breadcrumb"]),
    );
    expect(LAYOUT_FUNCTIONS).toEqual(
      expect.arrayContaining(["menu-root", "known-paths", "path-route"]),
    );
  });
});
