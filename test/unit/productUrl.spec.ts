import { describe, expect, it } from "vitest";
import {
  parseListParam,
  productDeepLink,
  withQuickViewConfiguration,
} from "../../app/utils/productUrl";

describe("productDeepLink", () => {
  it("uses the canonical product SEO URL when it is a deep link", () => {
    expect(
      productDeepLink(
        {
          productNumber: "LF-21",
          seoUrls: [
            { seoPathInfo: "Pizza-Margherita/LF-21", isCanonical: false },
            {
              seoPathInfo: "Speisekarte/Pizza/?produkt=LF-21",
              isCanonical: true,
            },
          ],
        },
        "/Speisekarte/Nudeln/",
      ),
    ).toBe("/Speisekarte/Pizza/?produkt=LF-21");
  });

  it("builds the link from the category without a deep link SEO URL", () => {
    expect(
      productDeepLink(
        {
          productNumber: "LF-21",
          seoUrls: [
            { seoPathInfo: "Pizza-Margherita/LF-21", isCanonical: true },
          ],
        },
        "/Speisekarte/Pizza/",
      ),
    ).toBe("/Speisekarte/Pizza/?produkt=LF-21");
    expect(productDeepLink({ productNumber: "A 1/2" }, "c/Pizza/")).toBe(
      "/c/Pizza/?produkt=A+1%2F2",
    );
  });

  it("is undefined without SEO URL and category", () => {
    expect(productDeepLink({ productNumber: "LF-21" })).toBeUndefined();
    expect(productDeepLink({}, "/c/Pizza/")).toBeUndefined();
  });
});

describe("parseListParam", () => {
  it("splits comma-separated and repeated values", () => {
    expect(parseListParam("Zwiebeln, Oliven,")).toEqual(["Zwiebeln", "Oliven"]);
    expect(parseListParam(["LF-500", "LF-501,LF-502"])).toEqual([
      "LF-500",
      "LF-501",
      "LF-502",
    ]);
    expect(parseListParam(undefined)).toEqual([]);
    expect(parseListParam([null])).toEqual([]);
  });
});

describe("withQuickViewConfiguration", () => {
  const query = {
    properties: "a|b",
    produkt: "LF-21",
    ohne: "Zwiebeln",
    extras: "LF-500",
  };

  it("replaces the configuration and keeps other parameters", () => {
    expect(
      withQuickViewConfiguration(query, {
        productNumber: "LF-21-groß",
        without: ["Zwiebeln", "Oliven"],
        extras: [],
      }),
    ).toEqual({
      properties: "a|b",
      produkt: "LF-21-groß",
      ohne: "Zwiebeln,Oliven",
    });
  });

  it("removes all three parameters without a configuration", () => {
    expect(withQuickViewConfiguration(query, undefined)).toEqual({
      properties: "a|b",
    });
  });
});
