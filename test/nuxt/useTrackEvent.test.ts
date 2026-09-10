import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useMatomo } from "../../app/composables/useMatomo";
import { useTrackEvent } from "../../app/composables/useTrackEvent";

const { mockUseScriptMatomoAnalytics } = vi.hoisted(() => ({
  mockUseScriptMatomoAnalytics: vi.fn(() => ({
    proxy: { _paq: { push: vi.fn() } },
  })),
}));

mockNuxtImport("useScriptMatomoAnalytics", () => mockUseScriptMatomoAnalytics);

// A useRuntimeConfig mock would also have to provide `app.baseURL` for the
// router setup of the test environment; setting the real config is simpler.
function setMatomoConfig(matomoUrl: string, siteId: string | number) {
  Object.assign(useRuntimeConfig().public.scripts.matomoAnalytics, {
    matomoUrl,
    siteId,
  });
}

describe("useMatomo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMatomoConfig("", "");
  });

  it("does not create the script without configuration", () => {
    expect(useMatomo()).toBeNull();
    expect(mockUseScriptMatomoAnalytics).not.toHaveBeenCalled();
  });

  it("does not create the script with an incomplete configuration", () => {
    setMatomoConfig("", 3);
    expect(useMatomo()).toBeNull();

    setMatomoConfig("https://analytics.example.com/", "");
    expect(useMatomo()).toBeNull();

    expect(mockUseScriptMatomoAnalytics).not.toHaveBeenCalled();
  });

  it("creates the script once Matomo URL and site ID are set", () => {
    setMatomoConfig("https://analytics.example.com/", 3);

    expect(useMatomo()).not.toBeNull();
    expect(mockUseScriptMatomoAnalytics).toHaveBeenCalledWith({
      watch: false,
      scriptOptions: { trigger: "onNuxtReady" },
    });
  });
});

describe("useTrackEvent", () => {
  const matomoWindow = window as Window & { _paq?: unknown[][] };

  beforeEach(() => {
    vi.clearAllMocks();
    setMatomoConfig("", "");
    // @nuxt/scripts declares `_paq` as always present; the queue only exists
    // once something was pushed.
    Reflect.deleteProperty(matomoWindow, "_paq");
  });

  it("is a no-op without Matomo configuration", () => {
    const { trackSearch } = useTrackEvent();

    expect(() => trackSearch("pizza", ["21", "22"])).not.toThrow();
    expect(mockUseScriptMatomoAnalytics).not.toHaveBeenCalled();
    expect(matomoWindow._paq).toBeUndefined();
  });

  // The commands land in Matomo's own `_paq` queue, so they do not depend on
  // the registry script, which is loaded after `onNuxtReady` (#314).
  it("queues tracking commands in _paq when Matomo is configured", () => {
    setMatomoConfig("https://analytics.example.com/", 3);

    const { trackSearch } = useTrackEvent();
    trackSearch("pizza", ["21", "22"]);

    expect(matomoWindow._paq).toEqual([["trackSiteSearch", "pizza", false, 2]]);
    expect(mockUseScriptMatomoAnalytics).not.toHaveBeenCalled();
  });

  it("tracks a page view with URL and title", () => {
    setMatomoConfig("https://analytics.example.com/", 3);
    document.title = "Pizza";

    useTrackEvent().trackPageView("/c/Pizza/");

    expect(matomoWindow._paq).toEqual([
      ["setCustomUrl", "/c/Pizza/"],
      ["setDocumentTitle", "Pizza"],
      ["trackPageView"],
    ]);
  });

  it("appends to an existing _paq queue", () => {
    setMatomoConfig("https://analytics.example.com/", 3);
    matomoWindow._paq = [["setSiteId", "3"]];

    useTrackEvent().trackAddToWishlist({
      productNumber: "21",
    } as Parameters<ReturnType<typeof useTrackEvent>["trackAddToWishlist"]>[0]);

    expect(matomoWindow._paq).toEqual([
      ["setSiteId", "3"],
      ["trackEvent", "Product", "AddToWishlist", "21"],
    ]);
  });
});
