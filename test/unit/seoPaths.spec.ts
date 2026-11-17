import { describe, expect, it } from "vitest";
import { mayBeSeoPath, seoPathKey } from "../../server/utils/seoPaths";

const KNOWN = new Set(
  ["Speisekarte/Pizza/", "Speisekarte/Gemüse-Gerichte/", "c/Old-Name/"].map(
    seoPathKey,
  ),
);

describe("seoPathKey", () => {
  it("compares paths like Shopware's lookup", () => {
    expect(seoPathKey("/Speisekarte/Pizza/")).toBe("speisekarte/pizza");
    expect(seoPathKey("Speisekarte/Pizza")).toBe("speisekarte/pizza");
    expect(seoPathKey("/speisekarte/gem%C3%BCse-gerichte/")).toBe(
      "speisekarte/gemuse-gerichte",
    );
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
  });

  it("rejects paths no category had", () => {
    expect(mayBeSeoPath("/wp-admin/", KNOWN)).toBe(false);
    expect(mayBeSeoPath("/.git/HEAD", KNOWN)).toBe(false);
  });

  it("leaves technical URLs and an unknown list to the lookup", () => {
    expect(mayBeSeoPath("/navigation/0123abcd", KNOWN)).toBe(true);
    expect(mayBeSeoPath("/wp-admin/", null)).toBe(true);
  });
});
