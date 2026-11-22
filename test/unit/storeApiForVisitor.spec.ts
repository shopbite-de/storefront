import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Store API for one visitor (the cart): the server's endpoint, the
 * visitor's token and address chain, and a timeout, so a paused Shopware
 * does not hold the visitor's cart writes.
 */
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function setup(config: { endpoint?: string } = {}) {
  const raw = vi.fn(async () => ({
    _data: { lineItems: [] },
    headers: new Headers({ "sw-context-token": "token-2" }),
  }));
  const plain = vi.fn(async () => ({}));
  vi.stubGlobal("$fetch", Object.assign(plain, { raw }));
  vi.stubGlobal("useRuntimeConfig", () => ({
    shopware: { endpoint: config.endpoint ?? "" },
    public: {
      shopware: {
        endpoint: "https://public.example/store-api",
        accessToken: "SWSC",
      },
    },
  }));
  const utils = await import("../../server/utils/storeApi");
  return { raw, plain, ...utils };
}

describe("storeApiForVisitor", () => {
  it("asks the server's endpoint with token, address chain and a timeout", async () => {
    const { raw, storeApiForVisitor } = await setup({
      endpoint: "http://shopware:8000/store-api",
    });

    const answer = await storeApiForVisitor({
      method: "POST",
      path: "/checkout/cart/line-item",
      body: { items: [] },
      contextToken: "token-1",
      forwardedFor: "203.0.113.7, 10.0.0.5",
    });

    expect(answer).toEqual({
      data: { lineItems: [] },
      contextToken: "token-2",
    });
    expect(raw).toHaveBeenCalledWith(
      "http://shopware:8000/store-api/checkout/cart/line-item",
      expect.objectContaining({
        method: "POST",
        headers: {
          "sw-access-key": "SWSC",
          "sw-context-token": "token-1",
          "x-forwarded-for": "203.0.113.7, 10.0.0.5",
        },
        retry: 0,
        timeout: expect.any(Number),
      }),
    );
    const timeout = (
      raw.mock.calls[0] as unknown as [string, { timeout: number }]
    )[1].timeout;
    expect(timeout).toBeGreaterThan(0);
    expect(timeout).toBeLessThanOrEqual(15_000);
  });

  it("shop-wide requests time out as well", async () => {
    const { plain, storeApiGet, storeApiPost } = await setup();
    await storeApiGet("/context");
    await storeApiPost("/product", { ids: [] });
    for (const call of plain.mock.calls as unknown as [
      string,
      { timeout?: number },
    ][]) {
      expect(call[1].timeout).toBeGreaterThan(0);
      expect(call[1].timeout).toBeLessThanOrEqual(15_000);
    }
    expect(plain).toHaveBeenCalledTimes(2);
  });

  it("falls back to the public endpoint", async () => {
    const { raw, storeApiForVisitor } = await setup();
    await storeApiForVisitor({ method: "GET", path: "/checkout/cart" });
    expect(raw).toHaveBeenCalledWith(
      "https://public.example/store-api/checkout/cart",
      expect.objectContaining({ headers: { "sw-access-key": "SWSC" } }),
    );
  });

  it("takes a longer timeout for a request that needs one (the order)", async () => {
    const { raw, storeApiForVisitor } = await setup();
    await storeApiForVisitor({
      method: "POST",
      path: "/checkout/order",
      body: {},
      timeoutMs: 60_000,
    });
    expect(
      (raw.mock.calls[0] as unknown as [string, { timeout: number }])[1]
        .timeout,
    ).toBe(60_000);
  });
});
