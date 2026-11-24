import { describe, expect, it, vi } from "vitest";
import {
  resolveShopwareConnection,
  shopwareConnection,
} from "../../../server/adapters/shopware/connection";

/**
 * Where the Shopware adapter finds the Store API (ADR 0001, step 8): the
 * private runtime config `shopware.endpoint` / `shopware.accessToken`
 * (NUXT_SHOPWARE_ENDPOINT, NUXT_SHOPWARE_ACCESS_TOKEN). The public names
 * of 2.x are read from the server's environment as a fallback in 3.x.
 */
describe("the Shopware connection", () => {
  it("takes endpoint and access key from the private runtime config", () => {
    const resolved = resolveShopwareConnection(
      { endpoint: "http://shopware:8000/store-api", accessToken: "SWSCNEW" },
      {},
    );
    expect(resolved).toEqual({
      endpoint: "http://shopware:8000/store-api",
      accessToken: "SWSCNEW",
      deprecated: [],
      missing: [],
    });
  });

  it("falls back to the public environment names of 2.x", () => {
    const resolved = resolveShopwareConnection(
      { endpoint: "", accessToken: "" },
      {
        NUXT_PUBLIC_SHOPWARE_ENDPOINT: "https://shop.example/store-api",
        NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN: "SWSCOLD",
      },
    );
    expect(resolved).toMatchObject({
      endpoint: "https://shop.example/store-api",
      accessToken: "SWSCOLD",
      missing: [],
    });
    expect(resolved.deprecated).toEqual([
      "NUXT_PUBLIC_SHOPWARE_ENDPOINT → NUXT_SHOPWARE_ENDPOINT",
      "NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN → NUXT_SHOPWARE_ACCESS_TOKEN",
    ]);
  });

  it("prefers the private endpoint over the public one of 2.x", () => {
    // a 2.x shop with an internal server endpoint next to the public one
    const resolved = resolveShopwareConnection(
      { endpoint: "http://shopware:8000/store-api", accessToken: "" },
      {
        NUXT_PUBLIC_SHOPWARE_ENDPOINT: "https://shop.example/store-api",
        NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN: "SWSCOLD",
      },
    );
    expect(resolved.endpoint).toBe("http://shopware:8000/store-api");
    expect(resolved.accessToken).toBe("SWSCOLD");
    expect(resolved.deprecated).toEqual([
      "NUXT_PUBLIC_SHOPWARE_ENDPOINT (not read: NUXT_SHOPWARE_ENDPOINT is set)",
      "NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN → NUXT_SHOPWARE_ACCESS_TOKEN",
    ]);
  });

  it("names what is missing", () => {
    expect(resolveShopwareConnection(undefined, {}).missing).toEqual([
      "NUXT_SHOPWARE_ENDPOINT",
      "NUXT_SHOPWARE_ACCESS_TOKEN",
    ]);
    expect(
      resolveShopwareConnection({ endpoint: "http://x/store-api" }, {}).missing,
    ).toEqual(["NUXT_SHOPWARE_ACCESS_TOKEN"]);
  });

  it("ignores blank values", () => {
    const resolved = resolveShopwareConnection(
      { endpoint: "  ", accessToken: "" },
      { NUXT_PUBLIC_SHOPWARE_ENDPOINT: " " },
    );
    expect(resolved.missing).toEqual([
      "NUXT_SHOPWARE_ENDPOINT",
      "NUXT_SHOPWARE_ACCESS_TOKEN",
    ]);
  });
});

describe("shopwareConnection at startup", () => {
  it("warns once, in one line, naming the new variables", () => {
    const warn = vi.fn();
    const connection = shopwareConnection(
      {},
      {
        NUXT_PUBLIC_SHOPWARE_ENDPOINT: "https://shop.example/store-api",
        NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN: "SWSCOLD",
      },
      { production: true, warn },
    );
    expect(connection).toEqual({
      endpoint: "https://shop.example/store-api",
      accessToken: "SWSCOLD",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("NUXT_SHOPWARE_ENDPOINT");
    expect(message).toContain("NUXT_SHOPWARE_ACCESS_TOKEN");
    // the warning never carries a value
    expect(message).not.toContain("SWSCOLD");
    expect(message).not.toContain("shop.example");
  });

  it("does not warn with the new names", () => {
    const warn = vi.fn();
    shopwareConnection(
      { endpoint: "http://shopware/store-api", accessToken: "SWSC" },
      {},
      { production: true, warn },
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("refuses to start in production without endpoint or access key", () => {
    expect(() =>
      shopwareConnection(
        { endpoint: "http://shopware/store-api" },
        {},
        { production: true, warn: vi.fn() },
      ),
    ).toThrowError(/NUXT_SHOPWARE_ACCESS_TOKEN/);
    expect(() =>
      shopwareConnection({}, {}, { production: true, warn: vi.fn() }),
    ).toThrowError(/NUXT_SHOPWARE_ENDPOINT.*NUXT_SHOPWARE_ACCESS_TOKEN/);
  });

  it("only warns about a missing connection during development", () => {
    const warn = vi.fn();
    expect(shopwareConnection({}, {}, { production: false, warn })).toEqual({
      endpoint: "",
      accessToken: "",
    });
    expect(String(warn.mock.calls[0]?.[0])).toContain("NUXT_SHOPWARE_ENDPOINT");
  });
});
