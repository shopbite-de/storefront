import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport, registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, getQuery } from "h3";
import { ref } from "vue";
import { useSectionRoute } from "~/composables/useSectionRoute";

const { mockFetch, mockNavigateTo, routeState } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockNavigateTo: vi.fn(),
  routeState: { path: "/c/Pizza/", query: {} as Record<string, string> },
}));

registerEndpoint("/api/resolve-path", async (event) =>
  mockFetch(getQuery(event).path),
);

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

const PIZZA = {
  kind: "menu-section",
  sectionId: "pizza",
  canonicalPath: "/c/Pizza/",
};

describe("useSectionRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.path = "/c/Pizza/";
    routeState.query = {};
    mockFetch.mockResolvedValue({ route: PIZZA });
  });

  it("asks the BFF for the path and does not redirect on the canonical one", async () => {
    const { sectionId } = await useSectionRoute();

    expect(mockFetch).toHaveBeenCalledWith("/c/Pizza/");
    expect(sectionId.value).toBe("pizza");
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("redirects permanently to the canonical path, keeping the query", async () => {
    routeState.path = "/c/pizza";
    routeState.query = { produkt: "SB-21" };
    mockFetch.mockResolvedValue({
      route: { kind: "redirect", to: "/c/Pizza/", sectionId: "pizza" },
    });

    const { sectionId } = await useSectionRoute();

    expect(sectionId.value).toBe("pizza");
    expect(mockNavigateTo).toHaveBeenCalledWith(
      { path: "/c/Pizza/", query: { produkt: "SB-21" } },
      { redirectCode: 301, replace: true },
    );
  });

  it("throws a 404 when no section has the path", async () => {
    routeState.path = "/c/Unbekannt/";
    mockFetch.mockResolvedValue({ route: null });

    await expect(useSectionRoute()).rejects.toMatchObject({ statusCode: 404 });
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it("passes on a failing backend instead of a 404", async () => {
    mockFetch.mockRejectedValue(createError({ statusCode: 503 }));

    await expect(useSectionRoute()).rejects.toMatchObject({ statusCode: 503 });
  });
});
