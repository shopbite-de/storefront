import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubNitro, type CachedHandler } from "./nitroStubs";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const load = async <T>(path: string): Promise<T> =>
  (await import(/* @vite-ignore */ path)).default as T;

describe("/api/_cache/purge", () => {
  async function purge(body: unknown) {
    const { keysToPurge, hasPurgeSecret } =
      await import("../../server/utils/cachePurge");
    const removeItem = vi.fn();
    stubNitro({
      useRuntimeConfig: () => ({ cachePurgeSecret: "s" }),
      getHeader: () => "Bearer s",
      readBody: async () => body,
      useStorage: () => ({
        getKeys: async () => [
          "cache:nitro:functions:shop-holidays:shop-holidays.json",
          "cache:nitro:handlers:listing:x1.json",
        ],
        removeItem,
      }),
      keysToPurge,
      hasPurgeSecret,
    });
    const handler = await load<(event: unknown) => Promise<unknown>>(
      "../../server/api/_cache/purge.post",
    );
    return { result: handler({}), removeItem };
  }

  it("accepts a layout target", async () => {
    const { result, removeItem } = await purge({ layout: true });
    expect(await result).toEqual({ purged: 1 });
    expect(removeItem).toHaveBeenCalledWith(
      "cache:nitro:functions:shop-holidays:shop-holidays.json",
    );
  });

  it("rejects a layout target that is not a boolean", async () => {
    const { result } = await purge({ layout: "yes" });
    await expect(result).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("cold caches during a Shopware outage", () => {
  const DOWN = Object.assign(new Error("503 Service Unavailable"), {
    statusCode: 503,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const HANDLERS: { path: string; params: Record<string, string> }[] = [
    { path: "../../server/api/payment-methods.get", params: {} },
    // the top sellers: test/unit/catalogRoutes.spec.ts; navigations and
    // breadcrumbs: test/unit/navigationRoutes.spec.ts
  ];

  for (const { path, params } of HANDLERS) {
    it(`asks Shopware once per pause: ${path.split("/api/")[1]} ${JSON.stringify(params)}`, async () => {
      const stubs = stubNitro();
      stubs.storeApiGet!.mockRejectedValue(DOWN);
      stubs.storeApiPost!.mockRejectedValue(DOWN);
      const { handler } = await load<CachedHandler>(path);
      const calls = () =>
        stubs.storeApiGet!.mock.calls.length +
        stubs.storeApiPost!.mock.calls.length;

      for (let i = 0; i < 3; i++) {
        await expect(handler({ params, context: {} })).rejects.toMatchObject({
          statusCode: 503,
        });
      }
      expect(calls()).toBe(1);

      vi.setSystemTime(31_000);
      await expect(handler({ params, context: {} })).rejects.toThrow();
      expect(calls()).toBe(2);
    });
  }

  it("serves the last good answer per key during an outage", async () => {
    const stubs = stubNitro();
    stubs
      .storeApiPost!.mockResolvedValueOnce({
        elements: [{ name: "Barzahlung" }],
      })
      .mockRejectedValue(DOWN);
    const { handler } = await load<CachedHandler>(
      "../../server/api/payment-methods.get",
    );

    expect(await handler({})).toEqual(["Barzahlung"]);
    expect(await handler({})).toEqual(["Barzahlung"]);
    expect(await handler({})).toEqual(["Barzahlung"]);
    expect(stubs.storeApiPost).toHaveBeenCalledTimes(2);
  });

  it("does not take a client error for an outage", async () => {
    const stubs = stubNitro();
    stubs.storeApiPost!.mockRejectedValue(
      Object.assign(new Error("400"), { statusCode: 400 }),
    );
    const { handler } = await load<CachedHandler>(
      "../../server/api/payment-methods.get",
    );

    await handler({}).catch(() => {});
    await handler({}).catch(() => {});
    expect(stubs.storeApiPost).toHaveBeenCalledTimes(2);
  });
});

describe("storeApi", () => {
  it("does not retry: a failing request reaches Shopware once", async () => {
    const fetch = vi.fn().mockResolvedValue({});
    stubNitro({ $fetch: fetch });
    const { storeApiGet, storeApiPost } =
      await import("../../server/utils/storeApi");

    await storeApiGet("/shopbite/holiday");
    await storeApiPost("/seo-url", {});
    for (const [, options] of fetch.mock.calls) {
      expect(options.retry).toBe(0);
    }
  });
});
