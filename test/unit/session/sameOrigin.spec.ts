import { describe, expect, it } from "vitest";
import { isCrossSiteWrite } from "../../../server/session/sameOrigin";

/**
 * CSRF (ADR 0001, step 4): the session cookie is SameSite=Lax, and every
 * state-changing BFF request must come from the storefront's own pages:
 * its origin (scheme and host) is the store URL's or the request's own.
 */
describe("isCrossSiteWrite", () => {
  const origins = ["https://shop.example.com"];

  it("lets reads through", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        isCrossSiteWrite({ method, origins, origin: "https://evil.example" }),
      ).toBe(false);
    }
  });

  it("compares the Origin with the storefront's origins, scheme included", () => {
    const check = (origin: string) =>
      isCrossSiteWrite({ method: "POST", origins, origin });
    expect(check("https://shop.example.com")).toBe(false);
    expect(check("https://SHOP.example.com")).toBe(false);
    expect(check("http://shop.example.com")).toBe(true);
    expect(check("https://shop.example.com:8443")).toBe(true);
    expect(check("https://evil.example")).toBe(true);
    expect(check("https://shop.example.com.evil.example")).toBe(true);
    expect(check("null")).toBe(true);
    expect(check("not a url")).toBe(true);
  });

  it("accepts any of the storefront's origins (store URL and the request's own)", () => {
    expect(
      isCrossSiteWrite({
        method: "DELETE",
        origins: ["http://localhost:3000", "http://localhost:3001"],
        origin: "http://localhost:3001",
      }),
    ).toBe(false);
  });

  it("an Origin wins over a same-origin claim it contradicts", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        origins,
        origin: "https://evil.example",
        secFetchSite: "same-origin",
      }),
    ).toBe(true);
  });

  it("trusts the browser's Sec-Fetch-Site without an Origin", () => {
    const check = (secFetchSite: string) =>
      isCrossSiteWrite({ method: "POST", origins, secFetchSite });
    expect(check("same-origin")).toBe(false);
    expect(check("none")).toBe(false);
    expect(check("same-site")).toBe(true);
    expect(check("cross-site")).toBe(true);
  });

  it("lets clients without browser headers through (no cookie is sent cross-site anyway)", () => {
    expect(isCrossSiteWrite({ method: "POST", origins })).toBe(false);
  });

  it("refuses a write without an origin to compare with", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        origins: [],
        origin: "https://shop.example.com",
      }),
    ).toBe(true);
  });
});
