import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import { useSeoUrlRoute } from "~/composables/useSeoUrlRoute";

const { mockResolvePath, mockNavigateTo, routeState } = vi.hoisted(() => ({
  mockResolvePath: vi.fn(),
  mockNavigateTo: vi.fn(),
  routeState: { path: "/c/Pizza/", query: {} as Record<string, string> },
}));

mockNuxtImport("useNavigationSearch", () => () => ({
  resolvePath: mockResolvePath,
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

  it("throws a 404 when the path cannot be resolved", async () => {
    routeState.path = "/c/Unbekannt/";

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
