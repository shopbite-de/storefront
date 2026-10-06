import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";

const { add, trackShare } = vi.hoisted(() => ({
  add: vi.fn(),
  trackShare: vi.fn(),
}));
mockNuxtImport("useToast", () => () => ({ add }));
mockNuxtImport("useTrackEvent", () => () => ({ trackShare }));

const sharedPath = () =>
  window.location.pathname + window.location.search + window.location.hash;

async function mountShare() {
  let api!: ReturnType<typeof useShareLink>;
  await mountSuspended(
    defineComponent({
      setup() {
        api = useShareLink();
        return () => h("div");
      },
    }),
  );
  return api;
}

describe("useShareLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    add.mockReset();
    trackShare.mockReset();
  });

  it("uses the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    const api = await mountShare();
    expect(api.canShare.value).toBe(true);
    await api.share({ title: "Pizza", productNumber: "P1" });

    expect(share).toHaveBeenCalledWith({
      title: "Pizza",
      url: window.location.href,
    });
    expect(add).not.toHaveBeenCalled();
    expect(trackShare).toHaveBeenCalledWith("share", "P1", sharedPath());
  });

  it("copies the link without share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    const api = await mountShare();
    await api.share({ productNumber: "P1" });

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Link kopiert" }),
    );
    expect(trackShare).toHaveBeenCalledWith("copy", "P1", sharedPath());
  });

  it("does not track without product number or when copying fails", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    const api = await mountShare();
    await api.share();
    writeText.mockRejectedValue(new Error("denied"));
    await api.share({ productNumber: "P1" });

    expect(trackShare).not.toHaveBeenCalled();
  });

  it("does nothing when the share sheet is closed", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("closed", "AbortError"));
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      share,
      clipboard: { writeText },
    });

    const api = await mountShare();
    await api.share({ productNumber: "P1" });

    expect(writeText).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(trackShare).not.toHaveBeenCalled();
  });
});
