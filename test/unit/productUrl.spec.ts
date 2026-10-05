import { describe, expect, it } from "vitest";
import { productDeepLink } from "../../app/utils/productUrl";

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
