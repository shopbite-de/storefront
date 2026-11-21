import { describe, expect, it } from "vitest";
import { isCrossSiteWrite } from "../../../server/session/sameOrigin";

/**
 * CSRF (ADR 0001, step 4): the session cookie is SameSite=Lax, and every
 * state-changing BFF request must come from the storefront's own pages.
 */
describe("isCrossSiteWrite", () => {
  const host = "shop.example.com";

  it("lets reads through", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        isCrossSiteWrite({
          method,
          hosts: [host],
          origin: "https://evil.example",
        }),
      ).toBe(false);
    }
  });

  it("trusts the browser's Sec-Fetch-Site", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        secFetchSite: "same-origin",
      }),
    ).toBe(false);
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        secFetchSite: "cross-site",
      }),
    ).toBe(true);
    expect(
      isCrossSiteWrite({
        method: "PATCH",
        hosts: [host],
        secFetchSite: "same-site",
      }),
    ).toBe(true);
    // a request the user started (address bar, bookmark) is no forgery
    expect(
      isCrossSiteWrite({ method: "POST", hosts: [host], secFetchSite: "none" }),
    ).toBe(false);
  });

  it("compares the Origin with the host the request was sent to", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        origin: "https://shop.example.com",
      }),
    ).toBe(false);
    expect(
      isCrossSiteWrite({
        method: "DELETE",
        hosts: ["localhost:3000"],
        origin: "http://localhost:3000",
      }),
    ).toBe(false);
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        origin: "https://evil.example",
      }),
    ).toBe(true);
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        origin: "https://shop.example.com.evil.example",
      }),
    ).toBe(true);
    expect(
      isCrossSiteWrite({ method: "POST", hosts: [host], origin: "null" }),
    ).toBe(true);
  });

  it("an Origin wins over a same-origin claim it contradicts", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [host],
        origin: "https://evil.example",
        secFetchSite: "same-origin",
      }),
    ).toBe(true);
  });

  it("lets clients without browser headers through (no cookie is sent cross-site anyway)", () => {
    expect(isCrossSiteWrite({ method: "POST", hosts: [host] })).toBe(false);
  });

  it("accepts any of the storefront's hosts (behind a proxy: forwarded host, store URL)", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: ["storefront:3000", "shop.example.com"],
        origin: "https://shop.example.com",
      }),
    ).toBe(false);
  });

  it("refuses a write without a host to compare with", () => {
    expect(
      isCrossSiteWrite({
        method: "POST",
        hosts: [],
        origin: "https://shop.example.com",
      }),
    ).toBe(true);
  });
});
