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
  vi.stubGlobal("$fetch", { raw });
  vi.stubGlobal("useRuntimeConfig", () => ({
    shopware: { endpoint: config.endpoint ?? "" },
    public: {
      shopware: {
        endpoint: "https://public.example/store-api",
        accessToken: "SWSC",
      },
    },
  }));
  const { storeApiForVisitor } = await import("../../server/utils/storeApi");
  return { raw, storeApiForVisitor };
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

  it("falls back to the public endpoint", async () => {
    const { raw, storeApiForVisitor } = await setup();
    await storeApiForVisitor({ method: "GET", path: "/checkout/cart" });
    expect(raw).toHaveBeenCalledWith(
      "https://public.example/store-api/checkout/cart",
      expect.objectContaining({ headers: { "sw-access-key": "SWSC" } }),
    );
  });
});
