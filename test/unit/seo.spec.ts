import { describe, expect, it } from "vitest";
import {
  buildHomeDescription,
  buildHomeTitle,
  formatPageTitle,
  toAbsoluteUrl,
} from "../../app/utils/seo";

const TEMPLATE = "%s | %siteName – Online bestellen";

describe("formatPageTitle", () => {
  it("applies the title template", () => {
    expect(formatPageTitle("Pizza", "La Fattoria", TEMPLATE)).toBe(
      "Pizza | La Fattoria – Online bestellen",
    );
  });

  it("renders the bare site name for a missing or site-name title", () => {
    expect(formatPageTitle(undefined, "La Fattoria", TEMPLATE)).toBe(
      "La Fattoria",
    );
    expect(formatPageTitle("", "La Fattoria", TEMPLATE)).toBe("La Fattoria");
    expect(formatPageTitle("La Fattoria", "La Fattoria", TEMPLATE)).toBe(
      "La Fattoria",
    );
  });

  it("renders the title as is without a template", () => {
    expect(formatPageTitle("Pizza", "La Fattoria", "")).toBe("Pizza");
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
    expect(buildHomeTitle({ name: "La Fattoria", city: "Obertshausen" })).toBe(
      "La Fattoria Obertshausen | Online bestellen & liefern lassen",
    );
  });

  it("does not repeat a city that is already part of the name", () => {
    expect(
      buildHomeTitle({ name: "Pizzeria Obertshausen", city: "Obertshausen" }),
    ).toBe("Pizzeria Obertshausen | Online bestellen & liefern lassen");
  });

  it("works without a city", () => {
    expect(buildHomeTitle({ name: "La Fattoria", city: "" })).toBe(
      "La Fattoria | Online bestellen & liefern lassen",
    );
  });
});

describe("buildHomeDescription", () => {
  it("combines cuisine, city and name", () => {
    expect(
      buildHomeDescription({
        name: "La Fattoria",
        city: "Obertshausen",
        cuisine: "Italienische Küche",
      }),
    ).toBe(
      "Italienische Küche in Obertshausen: Bei La Fattoria online bestellen und liefern lassen oder abholen.",
    );
  });

  it("uses city or cuisine alone", () => {
    expect(
      buildHomeDescription({ name: "La Fattoria", city: "Obertshausen" }),
    ).toBe(
      "La Fattoria in Obertshausen: Online bestellen und liefern lassen oder abholen.",
    );
    expect(
      buildHomeDescription({ name: "La Fattoria", cuisine: "Pizza & Pasta" }),
    ).toBe(
      "Pizza & Pasta: Bei La Fattoria online bestellen und liefern lassen oder abholen.",
    );
  });

  it("returns undefined without city and cuisine", () => {
    expect(
      buildHomeDescription({ name: "La Fattoria", city: "", cuisine: "" }),
    ).toBeUndefined();
  });
});
