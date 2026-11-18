import { describe, expect, it } from "vitest";
import {
  buildHomeDescription,
  buildHomeTitle,
  formatPageTitle,
  splitList,
  toAbsoluteUrl,
} from "../../app/utils/seo";

const TEMPLATE = "%s | %siteName – Online bestellen";

describe("formatPageTitle", () => {
  it("applies the title template", () => {
    expect(formatPageTitle("Pizza", "Esempio", TEMPLATE)).toBe(
      "Pizza | Esempio – Online bestellen",
    );
  });

  it("renders the bare site name for a missing or site-name title", () => {
    expect(formatPageTitle(undefined, "Esempio", TEMPLATE)).toBe("Esempio");
    expect(formatPageTitle("", "Esempio", TEMPLATE)).toBe("Esempio");
    expect(formatPageTitle("Esempio", "Esempio", TEMPLATE)).toBe("Esempio");
  });

  it("renders the title as is without a template", () => {
    expect(formatPageTitle("Pizza", "Esempio", "")).toBe("Pizza");
  });
});

describe("toAbsoluteUrl", () => {
  it("joins site-relative paths and keeps the trailing slash", () => {
    expect(toAbsoluteUrl("https://example.com", "/c/Pizza/")).toBe(
      "https://example.com/c/Pizza/",
    );
    expect(toAbsoluteUrl("https://example.com/", "/agb")).toBe(
      "https://example.com/agb",
    );
    expect(toAbsoluteUrl("https://example.com", "/")).toBe(
      "https://example.com/",
    );
  });

  it("keeps absolute and protocol-relative URLs", () => {
    expect(
      toAbsoluteUrl("https://example.com", "https://cdn.example.com/a.webp"),
    ).toBe("https://cdn.example.com/a.webp");
    expect(
      toAbsoluteUrl("https://example.com", "//cdn.example.com/a.webp"),
    ).toBe("//cdn.example.com/a.webp");
  });
});

describe("buildHomeTitle", () => {
  it("adds the city to the shop name", () => {
    expect(buildHomeTitle({ name: "Esempio", city: "Musterstadt" })).toBe(
      "Esempio Musterstadt | Online bestellen & liefern lassen",
    );
  });

  it("does not repeat a city that is already part of the name", () => {
    expect(
      buildHomeTitle({ name: "Pizzeria Musterstadt", city: "Musterstadt" }),
    ).toBe("Pizzeria Musterstadt | Online bestellen & liefern lassen");
  });

  it("works without a city", () => {
    expect(buildHomeTitle({ name: "Esempio", city: "" })).toBe(
      "Esempio | Online bestellen & liefern lassen",
    );
  });
});

describe("buildHomeDescription", () => {
  it("combines cuisine, city and name", () => {
    expect(
      buildHomeDescription({
        name: "Esempio",
        city: "Musterstadt",
        cuisine: "Italienische Küche",
      }),
    ).toBe(
      "Italienische Küche in Musterstadt: Bei Esempio online bestellen und liefern lassen oder abholen.",
    );
  });

  it("uses city or cuisine alone", () => {
    expect(buildHomeDescription({ name: "Esempio", city: "Musterstadt" })).toBe(
      "Esempio in Musterstadt: Online bestellen und liefern lassen oder abholen.",
    );
    expect(
      buildHomeDescription({ name: "Esempio", cuisine: "Pizza & Pasta" }),
    ).toBe(
      "Pizza & Pasta: Bei Esempio online bestellen und liefern lassen oder abholen.",
    );
  });

  it("returns undefined without city and cuisine", () => {
    expect(
      buildHomeDescription({ name: "Esempio", city: "", cuisine: "" }),
    ).toBeUndefined();
  });
});

describe("splitList", () => {
  it("splits a comma-separated value and keeps arrays", () => {
    expect(splitList("12345 Musterstadt, 12346 Beispieldorf,")).toEqual([
      "12345 Musterstadt",
      "12346 Beispieldorf",
    ]);
    expect(splitList(["A", "B"])).toEqual(["A", "B"]);
    expect(splitList("")).toEqual([]);
    expect(splitList(undefined)).toEqual([]);
  });
});
