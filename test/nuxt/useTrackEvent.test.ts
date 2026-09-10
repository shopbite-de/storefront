import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { useMatomo } from "../../app/composables/useMatomo";
import { useTrackEvent } from "../../app/composables/useTrackEvent";

const { mockPush, mockUseScriptMatomoAnalytics } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockUseScriptMatomoAnalytics: vi.fn(() => ({
      proxy: { _paq: { push: mockPush } },
    })),
  };
});

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
      scriptOptions: { trigger: "onNuxtReady" },
    });
  });
});

describe("useTrackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMatomoConfig("", "");
  });

  it("is a no-op without Matomo configuration", () => {
    const { trackSearch } = useTrackEvent();

    expect(() => trackSearch("pizza", ["21", "22"])).not.toThrow();
    expect(mockUseScriptMatomoAnalytics).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes tracking commands when Matomo is configured", () => {
    setMatomoConfig("https://analytics.example.com/", 3);

    const { trackSearch } = useTrackEvent();
    trackSearch("pizza", ["21", "22"]);

    expect(mockPush).toHaveBeenCalledWith([
      "trackSiteSearch",
      "pizza",
      false,
      2,
    ]);
  });
});
