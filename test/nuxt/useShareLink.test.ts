import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";

const { add } = vi.hoisted(() => ({ add: vi.fn() }));
mockNuxtImport("useToast", () => () => ({ add }));

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
  });

  it("uses the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    const api = await mountShare();
    expect(api.canShare.value).toBe(true);
    await api.share({ title: "Pizza" });

    expect(share).toHaveBeenCalledWith({
      title: "Pizza",
      url: window.location.href,
    });
    expect(add).not.toHaveBeenCalled();
  });

  it("copies the link without share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    const api = await mountShare();
    await api.share();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Link kopiert" }),
    );
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
    await api.share();

    expect(writeText).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});
