import { describe, expect, it } from "vitest";
import {
  isHostilePath,
  isSafeRedirectTarget,
  mayBeKnownPath,
  pathKey,
  routeTo,
  toggleTrailingSlash,
} from "../../../shared/domain";

const known = (
  paths: string[],
  unlistedPrefixes: string[] = ["/navigation/", "/detail/", "/landingPage/"],
) => ({ keys: new Set(paths.map(pathKey)), unlistedPrefixes });

const KNOWN = known([
  "/Speisekarte/Pizza/",
  "/Speisekarte/Gemüse-Gerichte/",
  "/c/Old-Name/",
  "/c/Straße/",
  "/c/A&B/",
]);

describe("pathKey", () => {
  it("compares paths like a case- and accent-insensitive collation", () => {
    expect(pathKey("/Speisekarte/Pizza/")).toBe("speisekarte/pizza");
    expect(pathKey("Speisekarte/Pizza")).toBe("speisekarte/pizza");
    expect(pathKey("/speisekarte/gem%C3%BCse-gerichte/")).toBe(
      "speisekarte/gemuse-gerichte",
    );
    expect(pathKey("/c/STRASSE/")).toBe(pathKey("/c/Straße/"));
    expect(pathKey("/c/a%26b/")).toBe("c/a&b");
  });

  it("keeps a path that is not valid URI encoding", () => {
    expect(pathKey("/a%E0%A4%A/")).toBe("a%e0%a4%a");
  });
});

describe("mayBeKnownPath", () => {
  it("accepts known paths in every casing, with or without slash", () => {
    for (const path of [
      "/Speisekarte/Pizza/",
      "/speisekarte/pizza",
      "/Speisekarte/Gem%C3%BCse-Gerichte/",
      "/c/old-name/",
      "/c/strasse/",
      "/c/a%26b/",
    ]) {
      expect(mayBeKnownPath(path, KNOWN), path).toBe(true);
    }
  });

  it("rejects ASCII paths no section had", () => {
    expect(mayBeKnownPath("/wp-admin/", KNOWN)).toBe(false);
    expect(mayBeKnownPath("/.git/HEAD", KNOWN)).toBe(false);
  });

  it("lets through what it cannot compare like a collation", () => {
    expect(mayBeKnownPath("/c/%C3%B8l/", KNOWN)).toBe(true);
  });

  it("leaves unlisted prefixes and an unknown list to the lookup", () => {
    const id = "0123456789abcdef0123456789abcdef";
    expect(mayBeKnownPath(`/navigation/${id}`, KNOWN)).toBe(true);
    expect(mayBeKnownPath(`/navigation/${id}`, known([], []))).toBe(false);
    // prefixes are case-sensitive
    expect(mayBeKnownPath(`/Navigation/${id}`, KNOWN)).toBe(false);
    expect(mayBeKnownPath("/wp-admin/", null)).toBe(true);
  });

  it("rejects hostile paths, even without a list of known paths", () => {
    for (const path of [
      "/%c0%ae%c0%ae/etc/passwd",
      "/%252e%252e/etc/passwd",
      "/..%252f..%252fetc%252fpasswd",
      "/../etc/passwd",
      "/%2e%2e/etc/passwd",
      "/%ff",
      `/${"a".repeat(751)}`,
    ]) {
      expect(isHostilePath(path), path).toBe(true);
      expect(mayBeKnownPath(path, KNOWN), path).toBe(false);
      expect(mayBeKnownPath(path, null), path).toBe(false);
    }
  });
});

describe("routeTo", () => {
  it("is the section on its canonical path, a redirect otherwise", () => {
    expect(routeTo("/c/Pizza/", "pizza", "/c/Pizza/")).toEqual({
      kind: "menu-section",
      sectionId: "pizza",
      canonicalPath: "/c/Pizza/",
    });
    expect(routeTo("/c/pizza", "pizza", "/c/Pizza/")).toEqual({
      kind: "redirect",
      to: "/c/Pizza/",
      sectionId: "pizza",
    });
  });

  it("does not redirect an encoded path that spells its canonical path", () => {
    expect(routeTo("/c/Getr%C3%A4nke/", "drinks", "/c/Getränke/")).toEqual({
      kind: "menu-section",
      sectionId: "drinks",
      canonicalPath: "/c/Getränke/",
    });
  });
});

describe("toggleTrailingSlash", () => {
  it("adds or removes one trailing slash", () => {
    expect(toggleTrailingSlash("/c/Pizza")).toBe("/c/Pizza/");
    expect(toggleTrailingSlash("/c/Pizza/")).toBe("/c/Pizza");
    expect(toggleTrailingSlash("/")).toBe("/");
  });
});

describe("hostile paths of scanners", () => {
  it("rejects control characters, also encoded", () => {
    for (const path of ["/a%00b", "/Pizza%0A", "/x%1f", "/x%7F", "/a\tb"]) {
      expect(isHostilePath(path), path).toBe(true);
    }
  });

  it("rejects a leading double slash or backslash (protocol-relative)", () => {
    for (const path of [
      "//evil.example/",
      "/\\evil.example/",
      "/%2Fevil.example/",
      "/%5Cevil",
    ]) {
      expect(isHostilePath(path), path).toBe(true);
    }
    expect(isHostilePath("/Speisekarte/Pizza/")).toBe(false);
  });
});

describe("isSafeRedirectTarget", () => {
  it("accepts storefront paths only", () => {
    expect(isSafeRedirectTarget("/Speisekarte/Pizza/")).toBe(true);
    for (const target of [
      "//evil.example/salate/",
      "/\\evil.example",
      "https://evil.example/",
      "Speisekarte/",
      "/%2F%2Fevil",
      "/a%0Ab",
    ]) {
      expect(isSafeRedirectTarget(target), target).toBe(false);
    }
  });
});
