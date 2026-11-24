import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let backend = "shopware";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("useRuntimeConfig", () => ({
    shopBite: { backend, timeZone: "Europe/Berlin" },
    public: { storeUrl: "https://shop.example.com" },
  }));
  vi.stubGlobal("$fetch", Object.assign(vi.fn(), { raw: vi.fn() }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const load = async () =>
  (await import("../../../server/utils/backend")).useBackend;

describe("useBackend", () => {
  it("defaults to the Shopware adapter", async () => {
    backend = "shopware";
    const useBackend = await load();
    expect(useBackend().name).toBe("shopware");
  });

  it("selects the memory adapter and keeps one instance per process", async () => {
    backend = "memory";
    const useBackend = await load();
    expect(useBackend().name).toBe("memory");
    expect(useBackend()).toBe(useBackend());
  });

  it("fails loudly for an unknown backend", async () => {
    backend = "magento";
    const useBackend = await load();
    expect(() => useBackend()).toThrowError(/Unknown shopBite\.backend/);
  });
});
