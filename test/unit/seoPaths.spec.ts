import { describe, expect, it, vi } from "vitest";
import { createBackoff } from "../../server/utils/backoff";
import { mayBeSeoPath, seoPathKey } from "../../server/utils/seoPaths";

const KNOWN = new Set(
  [
    "Speisekarte/Pizza/",
    "Speisekarte/Gemüse-Gerichte/",
    "c/Old-Name/",
    "c/Straße/",
    "c/A&B/",
  ].map(seoPathKey),
);

describe("seoPathKey", () => {
  it("compares paths like Shopware's lookup", () => {
    expect(seoPathKey("/Speisekarte/Pizza/")).toBe("speisekarte/pizza");
    expect(seoPathKey("Speisekarte/Pizza")).toBe("speisekarte/pizza");
    expect(seoPathKey("/speisekarte/gem%C3%BCse-gerichte/")).toBe(
      "speisekarte/gemuse-gerichte",
    );
    expect(seoPathKey("/c/STRASSE/")).toBe(seoPathKey("/c/Straße/"));
    expect(seoPathKey("/c/a%26b/")).toBe("c/a&b");
  });

  it("keeps a path that is not valid URI encoding", () => {
    expect(seoPathKey("/a%E0%A4%A/")).toBe("a%e0%a4%a");
  });
});

describe("mayBeSeoPath", () => {
  it("accepts known paths in every casing, with or without slash", () => {
    expect(mayBeSeoPath("/Speisekarte/Pizza/", KNOWN)).toBe(true);
    expect(mayBeSeoPath("/speisekarte/pizza", KNOWN)).toBe(true);
    expect(mayBeSeoPath("/Speisekarte/Gem%C3%BCse-Gerichte/", KNOWN)).toBe(
      true,
    );
    expect(mayBeSeoPath("/c/old-name/", KNOWN)).toBe(true);
    expect(mayBeSeoPath("/c/strasse/", KNOWN)).toBe(true);
    expect(mayBeSeoPath("/c/a%26b/", KNOWN)).toBe(true);
  });

  it("rejects ASCII paths no category had", () => {
    expect(mayBeSeoPath("/wp-admin/", KNOWN)).toBe(false);
    expect(mayBeSeoPath("/.git/HEAD", KNOWN)).toBe(false);
  });

  it("lets through what it cannot compare like the database", () => {
    expect(mayBeSeoPath("/c/%C3%B8l/", KNOWN)).toBe(true);
  });

  it("leaves technical URLs and an unknown list to the lookup", () => {
    expect(
      mayBeSeoPath("/navigation/0123456789abcdef0123456789abcdef", KNOWN),
    ).toBe(true);
    expect(mayBeSeoPath("/wp-admin/", null)).toBe(true);
  });
});

describe("createBackoff", () => {
  it("is active for the given time after a failure", () => {
    const now = vi.fn(() => 1000);
    const backoff = createBackoff(30_000, now);
    expect(backoff.active()).toBe(false);
    backoff.trip();
    now.mockReturnValue(30_999);
    expect(backoff.active()).toBe(true);
    now.mockReturnValue(31_000);
    expect(backoff.active()).toBe(false);
  });
});

describe("hostile paths", () => {
  const HOSTILE = [
    "/%c0%ae%c0%ae/etc/passwd",
    "/%252e%252e/etc/passwd",
    "/..%252f..%252fetc%252fpasswd",
    "/../etc/passwd",
    "/%2e%2e/etc/passwd",
    "/%ff",
    "/navigation/zzz",
    "/detail/abc",
    "/landingPage/x",
    "/navigation/0123456789abcdef0123456789abcdef/x",
  ];

  it("are rejected, even without a list of known paths", () => {
    for (const path of HOSTILE) {
      expect(mayBeSeoPath(path, KNOWN), path).toBe(false);
      expect(mayBeSeoPath(path, null), path).toBe(false);
    }
  });

  it("leave real technical URLs and non-ASCII paths to the lookup", () => {
    const id = "0123456789ABCDEF0123456789abcdef";
    expect(mayBeSeoPath(`/navigation/${id}`, KNOWN)).toBe(true);
    expect(mayBeSeoPath(`/detail/${id}/`, KNOWN)).toBe(true);
    expect(mayBeSeoPath(`/landingPage/${id}`, null)).toBe(true);
    expect(mayBeSeoPath("/c/%C3%B8l/", KNOWN)).toBe(true);
  });
});

describe("isOutage", () => {
  it("counts fetch errors without a response and 5xx, not bugs or 4xx", async () => {
    const { isOutage } = await import("../../server/utils/backoff");
    const fetchError = (status?: number) =>
      Object.assign(new Error("[GET] fetch failed"), {
        name: "FetchError",
        ...(status ? { status, statusCode: status } : {}),
      });

    expect(isOutage(fetchError())).toBe(true);
    expect(isOutage(fetchError(503))).toBe(true);
    expect(isOutage(fetchError(404))).toBe(false);
    expect(isOutage(new TypeError("x is undefined"))).toBe(false);
  });
});
