import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useSeoUrlRoute } from "~/composables/useSeoUrlRoute";

const { mockResolvePath, mockInvoke, mockNavigateTo, routeState } = vi.hoisted(
  () => ({
    mockResolvePath: vi.fn(),
    mockInvoke: vi.fn(),
    mockNavigateTo: vi.fn(),
    routeState: { path: "/c/Pizza/", query: {} as Record<string, string> },
  }),
);

mockNuxtImport("useNavigationSearch", () => () => ({
  resolvePath: mockResolvePath,
}));

mockNuxtImport("useShopwareContext", () => () => ({
  apiClient: { invoke: mockInvoke },
}));

mockNuxtImport("useRoute", () => () => routeState);

mockNuxtImport("navigateTo", () => mockNavigateTo);

// Run the handler directly; no caching between tests.
mockNuxtImport(
  "useAsyncData",
  () => async (_key: string, handler: () => Promise<unknown>) => {
    const data = ref<unknown>(null);
    const error = ref<unknown>(null);
    try {
      data.value = await handler();
    } catch (e) {
      error.value = e;
    }
    return { data, error };
  },
);

const pizza = {
  seoPathInfo: "c/Pizza/",
  foreignKey: "cat-pizza",
  routeName: "frontend.navigation.page",
};

describe("useSeoUrlRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.path = "/c/Pizza/";
    routeState.query = {};
    history.replaceState(null, "");
    // the backend lookup is case-insensitive and exact on the trailing slash
    mockResolvePath.mockImplementation(async (path: string) =>
      path.toLowerCase() === "/c/pizza/" ? pizza : null,
    );
    // no old SEO URLs unless a test says so
    mockInvoke.mockResolvedValue({ data: { elements: [] } });
  });

  it("resolves the route and does not redirect on the SEO URL", async () => {
    const { seoUrl } = await useSeoUrlRoute();

    expect(mockResolvePath).toHaveBeenCalledWith("/c/Pizza/");
    expect(seoUrl.value).toEqual(pizza);
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("redirects permanently to the SEO URL for an alias, keeping the query", async () => {
    routeState.path = "/c/pizza";
    routeState.query = { page: "2" };

    const { seoUrl } = await useSeoUrlRoute();

    expect(seoUrl.value).toEqual(pizza);
    expect(mockNavigateTo).toHaveBeenCalledWith(
      { path: "/c/Pizza/", query: { page: "2" } },
      { redirectCode: 301, replace: true },
    );
  });

  it("redirects permanently from an old SEO URL to the current one", async () => {
    routeState.path = "/c/Pizzen/";
    const oldPizza = {
      ...pizza,
      seoPathInfo: "c/Pizzen/",
      languageId: "lang-de",
      isCanonical: null,
    };
    mockInvoke
      .mockResolvedValueOnce({ data: { elements: [oldPizza] } })
      .mockResolvedValueOnce({ data: { elements: [pizza] } });

    const { seoUrl } = await useSeoUrlRoute();

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "readSeoUrl post /seo-url", {
      body: {
        limit: 1,
        filter: [
          { type: "equals", field: "seoPathInfo", value: "c/Pizzen/" },
          {
            type: "equals",
            field: "routeName",
            value: "frontend.navigation.page",
          },
          { type: "equals", field: "isCanonical", value: null },
        ],
      },
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "readSeoUrl post /seo-url", {
      body: {
        limit: 1,
        filter: [
          { type: "equals", field: "foreignKey", value: "cat-pizza" },
          {
            type: "equals",
            field: "routeName",
            value: "frontend.navigation.page",
          },
          { type: "equals", field: "languageId", value: "lang-de" },
          { type: "equals", field: "isCanonical", value: true },
        ],
      },
    });
    expect(seoUrl.value).toEqual(pizza);
    expect(mockNavigateTo).toHaveBeenCalledWith(
      { path: "/c/Pizza/", query: {} },
      { redirectCode: 301, replace: true },
    );
  });

  it("throws a 404 when the path cannot be resolved", async () => {
    routeState.path = "/c/Unbekannt/";

    await expect(useSeoUrlRoute()).rejects.toMatchObject({ statusCode: 404 });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("throws a 404 for a product SEO URL (no product pages)", async () => {
    routeState.path = "/Pizza-Margherita/21";
    mockResolvePath.mockResolvedValue({
      seoPathInfo: "Pizza-Margherita/21",
      foreignKey: "p21",
      routeName: "frontend.detail.page",
    });

    await expect(useSeoUrlRoute()).rejects.toMatchObject({ statusCode: 404 });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("throws a 404 when an old SEO URL has no current one", async () => {
    routeState.path = "/c/Geloescht/";
    mockInvoke
      .mockResolvedValueOnce({
        data: { elements: [{ ...pizza, seoPathInfo: "c/Geloescht/" }] },
      })
      .mockResolvedValue({ data: { elements: [] } });

    await expect(useSeoUrlRoute()).rejects.toMatchObject({ statusCode: 404 });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("uses the history state from client-side navigation without a request", async () => {
    history.replaceState(
      { routeName: "frontend.navigation.page", foreignKey: "cat-from-link" },
      "",
    );

    const { seoUrl } = await useSeoUrlRoute();

    expect(mockResolvePath).not.toHaveBeenCalled();
    expect(seoUrl.value?.foreignKey).toBe("cat-from-link");
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });
});
