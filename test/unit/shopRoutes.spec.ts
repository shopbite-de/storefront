import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryBackend } from "../../server/adapters/memory";
import type { Backend } from "../../server/ports";
import { CACHE_TTL, stubNitro, type CachedFunction } from "./nitroStubs";

/**
 * The restaurant operations behind the BFF (ADR 0001, step 1): the routes
 * answer domain types from `useBackend()`, cached for server-side rendering
 * and fresh with `?fresh=1` for the browser's live values.
 */
type Handler = (event: { query?: Record<string, unknown> }) => Promise<unknown>;

const ROUTES = [
  {
    path: "../../server/api/shop/config.get",
    name: "shop-config",
    ttl: CACHE_TTL.config,
    port: "shop",
    method: "getConfig",
  },
  {
    path: "../../server/api/shop/opening-hours.get",
    name: "shop-opening-hours",
    ttl: CACHE_TTL.businessHours,
    port: "shop",
    method: "getOpeningHours",
  },
  {
    path: "../../server/api/shop/holidays.get",
    name: "shop-holidays",
    ttl: CACHE_TTL.holidays,
    port: "shop",
    method: "getHolidays",
  },
  {
    path: "../../server/api/shop/branches.get",
    name: "shop-branches",
    ttl: CACHE_TTL.config,
    port: "shop",
    method: "listBranches",
  },
  {
    path: "../../server/api/checkout/shipping-methods.get",
    name: "shipping-methods",
    ttl: CACHE_TTL.config,
    port: "checkout",
    method: "listShippingMethods",
  },
] as const;

/** The class the freshly loaded routes see (modules are reset per test). */
let DomainError: typeof import("../../shared/domain").DomainError;

beforeEach(async () => {
  vi.resetModules();
  ({ DomainError } = await import("../../shared/domain"));
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A memory backend whose port method is a spy. */
function backendWith(
  port: "shop" | "checkout",
  method: string,
  impl?: () => Promise<unknown>,
) {
  const backend = createMemoryBackend();
  const real = (backend[port] as unknown as Record<string, () => unknown>)[
    method
  ]!.bind(backend[port]);
  const spy = vi.fn(impl ?? (async () => real()));
  const replaced = {
    ...backend,
    [port]: new Proxy(backend[port], {
      get: (target, key, receiver) =>
        key === method ? spy : Reflect.get(target, key, receiver),
    }),
  } as Backend;
  return { backend: replaced, spy, expected: real };
}

async function load(path: string, backend: Backend) {
  const stubs = stubNitro({ useBackend: () => backend });
  const handler = (await import(/* @vite-ignore */ path)).default as Handler;
  return { handler, stubs };
}

describe.each(ROUTES)("$path", ({ path, name, ttl, port, method }) => {
  it("answers the domain value of the port", async () => {
    const { backend, expected } = backendWith(port, method);
    const { handler } = await load(path, backend);
    expect(await handler({})).toEqual(await expected());
  });

  it("caches for server-side rendering, never longer than its TTL", async () => {
    const { backend, spy } = backendWith(port, method);
    const { handler, stubs } = await load(path, backend);

    await handler({});
    await handler({});
    expect(spy).toHaveBeenCalledOnce();
    const opts = (
      stubs.defineCachedFunction!.mock.results.find(
        (result) =>
          (result.value as CachedFunction<[], unknown>).opts.name === name,
      )?.value as CachedFunction<[], unknown>
    ).opts;
    expect(opts).toMatchObject({ name, maxAge: ttl, swr: false });
    expect(opts.getKey()).toBe(name);
  });

  it("asks the backend every time with ?fresh=1", async () => {
    const { backend, spy } = backendWith(port, method);
    const { handler } = await load(path, backend);

    await handler({});
    await handler({ query: { fresh: "1" } });
    await handler({ query: { fresh: "1" } });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("serves the last good answer during an outage and pauses the backend", async () => {
    const down = new DomainError("backend_unavailable", "down");
    let calls = 0;
    const { backend, expected } = backendWith(port, method, async () => {
      calls++;
      if (calls === 1) return expected();
      throw down;
    });
    const { handler } = await load(path, backend);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const good = await handler({});
    vi.setSystemTime(ttl * 1000 + 1);
    expect(await handler({})).toEqual(good);
    expect(await handler({})).toEqual(good);
    expect(calls).toBe(2);
  });

  it("never answers a fresh request from an old value", async () => {
    let calls = 0;
    const { backend, expected } = backendWith(port, method, async () => {
      calls++;
      if (calls === 1) return expected();
      throw new DomainError("backend_unavailable", "down");
    });
    const { handler } = await load(path, backend);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await handler({});
    await expect(handler({ query: { fresh: "1" } })).rejects.toMatchObject({
      statusCode: 503,
      data: { code: "backend_unavailable" },
    });
  });

  it("does not ask the backend for a fresh value while it is paused", async () => {
    const { backend, spy } = backendWith(port, method, () =>
      Promise.reject(new DomainError("backend_unavailable", "down")),
    );
    const { handler } = await load(path, backend);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handler({ query: { fresh: "1" } })).rejects.toMatchObject({
      statusCode: 503,
    });
    for (const query of [{ fresh: "1" }, {}]) {
      await expect(handler({ query })).rejects.toMatchObject({
        statusCode: 503,
        data: { code: "backend_unavailable" },
      });
    }
    expect(spy).toHaveBeenCalledOnce();

    vi.setSystemTime(31_000);
    await expect(handler({ query: { fresh: "1" } })).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("fails fast with 503 without a last good answer", async () => {
    const { backend, spy } = backendWith(port, method, () =>
      Promise.reject(new DomainError("backend_unavailable", "down")),
    );
    const { handler } = await load(path, backend);
    vi.spyOn(console, "error").mockImplementation(() => {});

    for (let i = 0; i < 3; i++) {
      await expect(handler({})).rejects.toMatchObject({
        statusCode: 503,
        data: { code: "backend_unavailable" },
      });
    }
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("a port the adapter does not implement", () => {
  it("answers 501 with the code", async () => {
    const { backend } = backendWith("shop", "getConfig", () =>
      Promise.reject(new DomainError("not_implemented", "later")),
    );
    const { handler } = await load("../../server/api/shop/config.get", backend);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 501,
      data: { code: "not_implemented" },
    });
  });
});

describe("cache purge", () => {
  it("knows every cached value of the restaurant operations", async () => {
    stubNitro({ useBackend: () => createMemoryBackend() });
    const { BACKEND_DATA_NAMES } = await import("../../server/utils/shopData");
    const { LAYOUT_FUNCTIONS } = await import("../../server/utils/cachePurge");
    expect(BACKEND_DATA_NAMES).toEqual(ROUTES.map((route) => route.name));
    expect(LAYOUT_FUNCTIONS).toEqual(
      expect.arrayContaining(BACKEND_DATA_NAMES),
    );
  });
});
