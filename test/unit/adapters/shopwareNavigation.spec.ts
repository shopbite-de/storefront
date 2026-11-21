import { describe, expect, it, vi } from "vitest";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../../server/adapters/shopware";
import {
  isHostileShopwarePath,
  seoUrlLookup,
  toNavigationNode,
  toSitemapEntries,
} from "../../../server/adapters/shopware/navigation";
import { isDomainError } from "../../../shared/domain";
import { NAVIGATION_SCENARIO } from "../../contract/navigation.contract";
import {
  CATEGORY_ROUTE,
  LANGUAGE,
  shopwareNavigationFake,
} from "../../contract/navigationFixtures";

/**
 * What Shopware sends that the domain cannot express, and what the adapter
 * asks for (the contract suite covers the domain behaviour).
 */
const PIZZA = "0a000000000000000000000000000002";
const PRODUCT = "0d000000000000000000000000000021";

function navigationOf(
  options: {
    menuCategoryId?: string;
    storeApi?: StoreApi;
  } = {},
) {
  const fake = shopwareNavigationFake(NAVIGATION_SCENARIO, [
    {
      id: "seo-product",
      foreignKey: PRODUCT,
      routeName: "frontend.detail.page",
      pathInfo: `/detail/${PRODUCT}`,
      seoPathInfo: "Pizza-Margherita/21",
      isCanonical: true,
      languageId: LANGUAGE,
    },
  ]);
  const get = vi.fn(fake.storeApi.get);
  const post = vi.fn(fake.storeApi.post);
  const storeApi: StoreApi = options.storeApi ?? {
    get: get as StoreApi["get"],
    post: post as StoreApi["post"],
  };
  const { navigation } = createShopwareBackend({
    storeApi,
    storeUrl: "",
    timeZone: "Europe/Berlin",
    log: () => {},
    menuCategoryId: options.menuCategoryId,
  });
  return { navigation, get, post, requests: fake.requests };
}

const fetchError = (status?: number) =>
  Object.assign(new Error("fetch failed"), {
    name: "FetchError",
    statusCode: status,
  });

describe("Shopware NavigationPort adapter (anti-corruption)", () => {
  describe("navigations", () => {
    it("asks the sales channel's navigation roots and the menu root", async () => {
      const { navigation, post } = navigationOf();
      await navigation.getNavigation("main");
      await navigation.getNavigation("footer");
      await navigation.getNavigation("menu");
      await navigation.getNavigation("home");

      const paths = post.mock.calls.map(([path]) => path);
      expect(paths).toEqual([
        "/navigation/main-navigation/main-navigation",
        "/navigation/footer-navigation/footer-navigation",
        `/navigation/main-navigation/${NAVIGATION_SCENARIO.menuRoot.id}`,
        `/navigation/main-navigation/${NAVIGATION_SCENARIO.menuRoot.id}`,
      ]);
      // the home page needs only the first level, with photos
      expect(post.mock.calls[3]![1]).toMatchObject({
        depth: 1,
        includes: { media: ["url", "thumbnails", "metaData"] },
      });
      expect(post.mock.calls[2]![1]).not.toHaveProperty("depth");
    });

    it("maps category types, the new-tab flag, names and icons", () => {
      expect(
        toNavigationNode({
          id: "c1",
          name: "Menu",
          translated: {
            name: "Speisekarte",
            customFields: { shopbite_category_icon: "i-lucide-utensils" },
          },
          type: "page",
          seoUrl: "/Speisekarte/",
          linkNewTab: null,
          children: [
            {
              id: "c2",
              name: "Instagram",
              type: "link",
              seoUrl: "https://instagram.example.com",
              linkNewTab: true,
            },
            { id: "c3", name: "Spalte", type: "folder", seoUrl: null },
          ],
        }),
      ).toEqual({
        id: "c1",
        label: "Speisekarte",
        kind: "menu-section",
        path: "/Speisekarte/",
        external: false,
        icon: "i-lucide-utensils",
        media: null,
        children: [
          {
            id: "c2",
            label: "Instagram",
            kind: "link",
            path: "https://instagram.example.com",
            external: true,
            icon: null,
            media: null,
            children: [],
          },
          {
            id: "c3",
            label: "Spalte",
            kind: "group",
            path: null,
            external: false,
            icon: null,
            media: null,
            children: [],
          },
        ],
      });
    });

    it("keeps a technical URL of a page without SEO URL as its path", () => {
      expect(
        toNavigationNode({
          id: "c1",
          name: "Neu",
          type: "page",
          seoUrl: "/navigation/0a000000000000000000000000000009",
        }).path,
      ).toBe("/navigation/0a000000000000000000000000000009");
    });

    it("answers a navigation Shopware does not have as not_found", async () => {
      const { navigation } = navigationOf({
        storeApi: {
          get: async () => ({}) as never,
          post: async () => {
            throw fetchError(404);
          },
        },
      });
      const error = await navigation
        .getNavigation("footer")
        .catch((caught: unknown) => caught);
      expect(isDomainError(error, "not_found")).toBe(true);
    });
  });

  describe("menu root", () => {
    it("takes the configured root without asking the plugin", async () => {
      const { navigation, get } = navigationOf({ menuCategoryId: "env-root" });
      expect(await navigation.getMenuRootId()).toBe("env-root");
      expect(get).not.toHaveBeenCalled();
    });

    it("falls back to the navigation root when the plugin names none", async () => {
      const { navigation } = navigationOf({
        storeApi: {
          get: async <T>() => ({ menuCategoryId: null }) as T,
          post: async () => [] as never,
        },
      });
      expect(await navigation.getMenuRootId()).toBe("main-navigation");
    });

    it("rejects when the plugin configuration fails, never guesses", async () => {
      const { navigation } = navigationOf({
        storeApi: {
          get: async () => {
            throw fetchError();
          },
          post: async () => [] as never,
        },
      });
      const error = await navigation
        .getMenuRootId()
        .catch((caught: unknown) => caught);
      expect(isDomainError(error, "backend_unavailable")).toBe(true);
    });
  });

  describe("breadcrumbs", () => {
    it("asks the category breadcrumb and prefixes the paths", async () => {
      const { navigation, get } = navigationOf();
      expect(await navigation.getBreadcrumb(PIZZA)).toEqual([
        { label: "Speisekarte", path: "/Speisekarte/" },
        { label: "Pizza", path: "/Speisekarte/Pizza/" },
      ]);
      expect(get).toHaveBeenCalledWith(`/breadcrumb/${PIZZA}`, {
        query: { type: "category" },
      });
    });

    it("takes Shopware's 404 for an id it has no route for as not_found", async () => {
      const { navigation } = navigationOf({
        storeApi: {
          get: async () => {
            throw fetchError(404);
          },
          post: async () => [] as never,
        },
      });
      const error = await navigation
        .getBreadcrumb("zzz")
        .catch((caught: unknown) => caught);
      expect(isDomainError(error, "not_found")).toBe(true);
    });
  });

  describe("path resolution", () => {
    it("looks technical URLs up by pathInfo and redirects to the SEO URL", async () => {
      const { navigation, post } = navigationOf();
      for (const path of [
        `/navigation/${PIZZA}`,
        `/navigation/${PIZZA}/`,
        `/navigation/${PIZZA.toUpperCase()}`,
      ]) {
        expect(await navigation.resolvePath(path), path).toEqual({
          kind: "redirect",
          to: "/Speisekarte/Pizza/",
          sectionId: PIZZA,
        });
      }
      expect(post.mock.calls[0]![1]).toMatchObject({
        limit: 1,
        filter: [
          { type: "equals", field: "pathInfo", value: `/navigation/${PIZZA}` },
        ],
      });
    });

    it("takes `/Navigation/<id>` for a SEO path, not a technical URL", async () => {
      expect(seoUrlLookup(`/Navigation/${PIZZA}`)).toEqual({
        field: "seoPathInfo",
        value: `Navigation/${PIZZA}`,
      });
      const { navigation } = navigationOf();
      expect(await navigation.resolvePath(`/Navigation/${PIZZA}`)).toBeNull();
    });

    it("has no page for a dish's SEO URL or technical URL (#289)", async () => {
      const { navigation } = navigationOf();
      expect(await navigation.resolvePath("/Pizza-Margherita/21")).toBeNull();
      expect(await navigation.resolvePath(`/detail/${PRODUCT}`)).toBeNull();
    });

    it("asks no lookup for a path no SEO URL can have", async () => {
      const { navigation, requests } = navigationOf();
      for (const path of [
        "/navigation/zzz",
        "/detail/abc",
        "/landingPage/x",
        `/navigation/${PIZZA}/x`,
        "/%c0%ae%c0%ae/etc/passwd",
        "/%252e%252e/etc/passwd",
        "/%ff",
      ]) {
        expect(isHostileShopwarePath(path), path).toBe(true);
        expect(await navigation.resolvePath(path), path).toBeNull();
      }
      expect(requests).toEqual([]);
    });

    it("finds a former SEO URL by isCanonical null, then the current one in its language", async () => {
      const { navigation, post } = navigationOf();
      await navigation.resolvePath("/Speisekarte/Fisch/");

      const bodies = post.mock.calls.map(([, body]) => body);
      expect(bodies).toContainEqual(
        expect.objectContaining({
          filter: [
            {
              type: "equals",
              field: "seoPathInfo",
              value: "Speisekarte/Fisch/",
            },
            { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
            { type: "equals", field: "isCanonical", value: null },
          ],
        }),
      );
      expect(bodies).toContainEqual(
        expect.objectContaining({
          filter: [
            {
              type: "equals",
              field: "foreignKey",
              value: "0a000000000000000000000000000004",
            },
            { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
            { type: "equals", field: "languageId", value: LANGUAGE },
            { type: "equals", field: "isCanonical", value: true },
          ],
        }),
      );
    });

    it("asks once for a canonical path, twice for a toggled slash", async () => {
      const { navigation, post } = navigationOf();
      await navigation.resolvePath("/Speisekarte/Pizza/");
      expect(post).toHaveBeenCalledTimes(1);
      post.mockClear();
      await navigation.resolvePath("/Speisekarte/Pizza");
      expect(post).toHaveBeenCalledTimes(2);
    });

    it("answers an outage as backend_unavailable", async () => {
      const { navigation } = navigationOf({
        storeApi: {
          get: async () => ({}) as never,
          post: async () => {
            throw fetchError(503);
          },
        },
      });
      const error = await navigation
        .resolvePath("/Speisekarte/Pizza/")
        .catch((caught: unknown) => caught);
      expect(isDomainError(error, "backend_unavailable")).toBe(true);
    });
  });

  describe("sitemap", () => {
    it("lists pages with a SEO URL, not links, folders, technical URLs or duplicates", () => {
      expect(
        toSitemapEntries([
          {
            id: "1",
            type: "page",
            seoUrl: "/c/Pizza/",
            createdAt: "2025-01-01T00:00:00.000+00:00",
            updatedAt: "2025-11-17T10:00:00.000+00:00",
            media: { url: "https://cdn.example.com/pizza.webp" },
          },
          {
            id: "2",
            type: "page",
            seoUrl: "/Salate",
            createdAt: "2025-06-29T00:00:00.000+00:00",
            updatedAt: null,
          },
          {
            id: "3",
            type: "page",
            seoUrl: "/navigation/018d9f1649c9709580aab97a16368d8d",
          },
          { id: "4", type: "link", seoUrl: "/agb" },
          { id: "5", type: "link", seoUrl: "tel:+49123456780" },
          { id: "6", type: "folder", seoUrl: null },
          { id: "7", type: "page", seoUrl: "//evil.example.com/" },
          { id: "8", type: "page" },
          { id: "9", type: "page", seoUrl: "/c/Pizza/" },
        ]),
      ).toEqual([
        {
          path: "/c/Pizza/",
          lastModified: "2025-11-17T10:00:00.000+00:00",
          image: "https://cdn.example.com/pizza.webp",
        },
        {
          path: "/Salate",
          lastModified: "2025-06-29T00:00:00.000+00:00",
          image: null,
        },
      ]);
    });

    it("reads both trees with SEO URLs, the navigation root alone when the menu root fails", async () => {
      const post = vi.fn(async () => [] as never);
      const { navigation } = navigationOf({
        storeApi: {
          get: async () => {
            throw fetchError();
          },
          post,
        },
      });
      expect(await navigation.listSitemapEntries()).toEqual([]);
      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith(
        "/navigation/main-navigation/main-navigation",
        expect.objectContaining({ depth: 10, buildTree: false }),
        { headers: { "sw-include-seo-urls": "true" } },
      );
    });
  });

  describe("known paths", () => {
    it("pages through the category SEO URLs with `page`, sorted by id", async () => {
      const page = (n: number, prefix: string) =>
        Array.from({ length: n }, (_, i) => ({
          seoPathInfo: `${prefix}${i}/`,
        }));
      const post = vi.fn(
        async (
          _path: string,
          criteria: { page: number; filter: { value: unknown }[] },
        ) => {
          const canonical = criteria.filter[1]!.value === true;
          if (!canonical) return { elements: page(1, "alt") } as never;
          return {
            elements: page(criteria.page < 3 ? 100 : 5, `p${criteria.page}-`),
          } as never;
        },
      );
      const { navigation } = navigationOf({
        storeApi: { get: async () => ({}) as never, post: post as never },
      });

      const known = await navigation.listKnownPaths();
      expect(known!.current).toHaveLength(205);
      expect(known!.current).toContain("/p2-7/");
      expect(known!.former).toEqual(["/alt0/"]);
      expect(known!.unlistedPrefixes).toEqual([
        "/navigation/",
        "/detail/",
        "/landingPage/",
      ]);
      for (const [, criteria] of post.mock.calls) {
        expect(criteria).toMatchObject({
          sort: [{ field: "id", order: "ASC" }],
          filter: [
            { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
            expect.objectContaining({ field: "isCanonical" }),
          ],
        });
      }
    });

    it("answers null for more paths than fit the pages", async () => {
      const post = vi.fn(async () => ({
        elements: Array.from({ length: 100 }, (_, i) => ({
          seoPathInfo: `${i}`,
        })),
      }));
      const { navigation } = navigationOf({
        storeApi: { get: async () => ({}) as never, post: post as never },
      });
      expect(await navigation.listKnownPaths()).toBeNull();
    });
  });
});

describe("Shopware NavigationPort review fixes", () => {
  const ID = "0a000000000000000000000000000002";

  it("takes the menu root the storefront resolved, without asking the plugin", async () => {
    const { navigation, get, post } = navigationOf();
    const root = NAVIGATION_SCENARIO.menuRoot.id;
    await navigation.getNavigation("menu", root);
    await navigation.getNavigation("home", root);
    expect(get).not.toHaveBeenCalled();
    expect(post.mock.calls.map(([path]) => path)).toEqual([
      `/navigation/main-navigation/${root}`,
      `/navigation/main-navigation/${root}`,
    ]);
  });

  it("asks a technical URL once: no slash variant, no former SEO URLs", async () => {
    const { navigation, post } = navigationOf();
    expect(
      await navigation.resolvePath(`/navigation/${"0".repeat(32)}`),
    ).toBeNull();
    expect(
      await navigation.resolvePath(`/navigation/${"0".repeat(32)}/`),
    ).toBeNull();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("answers no route for a SEO URL that would lead to another host", async () => {
    const log = vi.fn();
    const post = vi.fn(async () => ({
      elements: [
        {
          foreignKey: ID,
          routeName: CATEGORY_ROUTE,
          seoPathInfo: "//evil.example/salate/",
        },
      ],
    }));
    const { navigation } = createShopwareBackend({
      storeApi: { get: async () => ({}) as never, post: post as never },
      storeUrl: "",
      timeZone: "Europe/Berlin",
      log,
    });
    expect(await navigation.resolvePath("/salate/")).toBeNull();
    expect(log).toHaveBeenCalled();
  });
});
