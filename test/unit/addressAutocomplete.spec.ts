import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubNitro, type TestEvent } from "./nitroStubs";

const API_KEY = "secret-geoapify-key";
const BOX = "8.822251,50.055026,8.899077,50.104327";

type Handler = (event: TestEvent & { ip?: string }) => Promise<unknown>;

const feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [8.86, 50.07] },
  properties: {
    street: "Hauptstraße",
    housenumber: "1",
    city: "Musterstadt",
    postcode: "12345",
    formatted: "Hauptstraße 1, 12345 Musterstadt, Deutschland",
    place_id: "abc",
    datasource: { sourcename: "openstreetmap" },
  },
};

let fetchMock: ReturnType<typeof vi.fn>;

async function loadHandler(
  boundingBox = BOX,
  apiKey = API_KEY,
): Promise<Handler> {
  vi.resetModules();
  const utils = await import("../../server/utils/addressAutocomplete");
  fetchMock = vi.fn().mockResolvedValue({ features: [feature] });
  stubNitro({
    ...utils,
    $fetch: fetchMock,
    getRequestIP: (event: { ip?: string }) => event.ip ?? "203.0.113.1",
    setResponseHeader: vi.fn(),
    useRuntimeConfig: () => ({
      geoapifyApiKey: apiKey,
      addressAutocomplete: {
        rateLimit: { capacity: 3, refillPerMinute: 6 },
      },
      public: { shopBite: { addressAutocomplete: { boundingBox } } },
    }),
  });
  return (await import("../../server/api/address/autocomplete.get"))
    .default as unknown as Handler;
}

const requestedUrl = (call = 0) => new URL(fetchMock.mock.calls[call]![0]);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/api/address/autocomplete", () => {
  it("asks Geoapify with the allowed parameters only", async () => {
    const handler = await loadHandler();
    await handler({
      query: { text: "Hauptstraße 1", lang: "de", limit: "5", apiKey: "x" },
    });

    const url = requestedUrl();
    expect(url.origin + url.pathname).toBe(
      "https://api.geoapify.com/v1/geocode/autocomplete",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      apiKey: API_KEY,
      text: "Hauptstraße 1",
      lang: "de",
      limit: "5",
      filter: `rect:${BOX}`,
    });
  });

  it("takes the area from the runtime config, never from the query", async () => {
    const handler = await loadHandler("");
    await handler({
      query: { text: "Hauptstraße 1", filter: "rect:0,0,180,90" },
    });

    expect(requestedUrl().searchParams.has("filter")).toBe(false);
  });

  it("ignores a malformed area in the runtime config", async () => {
    const handler = await loadHandler("8.8,50.0,nope");
    await handler({ query: { text: "Hauptstraße 1" } });

    expect(requestedUrl().searchParams.has("filter")).toBe(false);
  });

  it("returns no suggestions for text shorter than three characters", async () => {
    const handler = await loadHandler();

    expect(await handler({ query: { text: "ab" } })).toEqual({ features: [] });
    expect(await handler({ query: {} })).toEqual({ features: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ text: "a".repeat(201) }],
    [{ text: ["Hauptstraße", "Nebenstraße"] }],
    [{ text: "Hauptstraße 1", limit: "0" }],
    [{ text: "Hauptstraße 1", limit: "11" }],
    [{ text: "Hauptstraße 1", limit: "2.5" }],
    [{ text: "Hauptstraße 1", limit: "5abc" }],
    [{ text: "Hauptstraße 1", lang: "deu" }],
    [{ text: "Hauptstraße 1", lang: "de&apiKey=x" }],
  ])("rejects %o with 400 without asking Geoapify", async (query) => {
    const handler = await loadHandler();

    await expect(handler({ query })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only the address fields of the suggestions", async () => {
    const handler = await loadHandler();

    expect(await handler({ query: { text: "Hauptstraße 1" } })).toEqual({
      features: [
        {
          properties: {
            street: "Hauptstraße",
            housenumber: "1",
            city: "Musterstadt",
            postcode: "12345",
            formatted: "Hauptstraße 1, 12345 Musterstadt, Deutschland",
          },
        },
      ],
    });
  });

  it("never passes the upstream error text on and logs the URL redacted", async () => {
    const handler = await loadHandler();
    const upstream = `[GET] "https://api.geoapify.com/v1/geocode/autocomplete?apiKey=${API_KEY}&text=x": 401 Unauthorized`;
    fetchMock.mockRejectedValue(
      Object.assign(new Error(upstream), { response: { status: 401 } }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = await handler({ query: { text: "Hauptstraße 1" } }).catch(
      (e: unknown) => e as Error & { statusCode: number },
    );

    expect(error).toMatchObject({ statusCode: 502 });
    expect(JSON.stringify(error)).not.toContain(API_KEY);
    expect((error as Error).message).not.toContain(API_KEY);
    expect((error as Error).message).not.toContain("geoapify.com");
    expect(log).toHaveBeenCalled();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(API_KEY);
    expect(logged).toContain("apiKey=***");
  });

  it("answers an identical lookup from a short-lived cache", async () => {
    const handler = await loadHandler();
    await handler({ query: { text: "Hauptstraße 1" } });
    await handler({ query: { text: "Hauptstraße 1" }, ip: "x" });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10 * 60 * 1000);
    await handler({ query: { text: "Hauptstraße 1" }, ip: "y" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed lookup", async () => {
    const handler = await loadHandler();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error("fetch failed"));

    await expect(
      handler({ query: { text: "Hauptstraße 1" } }),
    ).rejects.toBeTruthy();
    await handler({ query: { text: "Hauptstraße 1" } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("limits the lookups per client IP", async () => {
    const handler = await loadHandler();
    for (const n of [1, 2, 3]) {
      await handler({ query: { text: `Hauptstraße ${n}` }, ip: "a" });
    }

    await expect(
      handler({ query: { text: "Hauptstraße 4" }, ip: "a" }),
    ).rejects.toMatchObject({ statusCode: 429 });
    // another client is not affected
    await handler({ query: { text: "Hauptstraße 4" }, ip: "b" });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    // capacity 3, 6 per minute: one token after 10 s
    vi.advanceTimersByTime(10_000);
    await handler({ query: { text: "Hauptstraße 5" }, ip: "a" });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("returns no suggestions without an API key", async () => {
    const handler = await loadHandler(BOX, "");

    expect(await handler({ query: { text: "Hauptstraße 1" } })).toEqual({
      features: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createTokenBucketLimiter", () => {
  it("keeps at most maxKeys clients", async () => {
    const { createTokenBucketLimiter } =
      await import("../../server/utils/addressAutocomplete");
    const limiter = createTokenBucketLimiter({
      capacity: 1,
      refillPerMinute: 1,
      maxKeys: 2,
    });

    expect(limiter.take("a")).toBe(true);
    expect(limiter.take("b")).toBe(true);
    expect(limiter.take("c")).toBe(true);
    expect(limiter.size()).toBeLessThanOrEqual(2);
  });
});

describe("createTtlCache", () => {
  it("keeps at most maxEntries entries", async () => {
    const { createTtlCache } =
      await import("../../server/utils/addressAutocomplete");
    const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });
});
