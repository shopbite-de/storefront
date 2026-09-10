import { describe, expect, it } from "vitest";
import {
  categoriesToSitemapUrls,
  restoreTrailingSlashes,
} from "../../server/utils/sitemap";

type Category = Parameters<typeof categoriesToSitemapUrls>[0][number];
// The tests only need a partial category shape.
const asCategories = (categories: unknown) => categories as Category[];

describe("categoriesToSitemapUrls", () => {
  it("maps page categories with SEO URL, lastmod and image", () => {
    const urls = categoriesToSitemapUrls(
      asCategories([
        {
          type: "page",
          seoUrl: "/c/Pizza/",
          createdAt: "2025-01-01T00:00:00.000+00:00",
          updatedAt: "2025-11-17T10:00:00.000+00:00",
          media: { url: "https://cdn.example.com/pizza.webp" },
        },
        {
          type: "page",
          seoUrl: "/Salate",
          createdAt: "2025-06-29T00:00:00.000+00:00",
          updatedAt: null,
        },
      ]),
    );

    expect(urls).toEqual([
      {
        loc: "/c/Pizza/",
        lastmod: "2025-11-17T10:00:00.000+00:00",
        images: [{ loc: "https://cdn.example.com/pizza.webp" }],
        _trailingSlash: true,
      },
      {
        loc: "/Salate",
        lastmod: "2025-06-29T00:00:00.000+00:00",
      },
    ]);
  });

  it("skips links, folders, technical and missing URLs and duplicates", () => {
    const urls = categoriesToSitemapUrls(
      asCategories([
        {
          type: "page",
          seoUrl: "/navigation/018d9f1649c9709580aab97a16368d8d",
        },
        { type: "link", seoUrl: "/agb" },
        { type: "link", seoUrl: "tel:+491726723920" },
        { type: "folder", seoUrl: null },
        { type: "page", seoUrl: "//evil.example.com/" },
        { type: "page" },
        { type: "page", seoUrl: "/c/Nudeln/" },
        { type: "page", seoUrl: "/c/Nudeln/" },
      ]),
    );

    expect(urls.map((url) => url.loc)).toEqual(["/c/Nudeln/"]);
  });
});

describe("restoreTrailingSlashes", () => {
  const xml = [
    "<url><loc>https://example.com/c/Pizza</loc>",
    "<image:image><image:loc>https://cdn.example.com/c/Pizza</image:loc></image:image></url>",
    "<url><loc>https://example.com/agb</loc></url>",
    "<url><loc>https://example.com/</loc></url>",
  ].join("");

  it("re-appends the slash to listed paths only", () => {
    expect(restoreTrailingSlashes(xml, new Set(["/c/Pizza"]))).toBe(
      [
        "<url><loc>https://example.com/c/Pizza/</loc>",
        "<image:image><image:loc>https://cdn.example.com/c/Pizza</image:loc></image:image></url>",
        "<url><loc>https://example.com/agb</loc></url>",
        "<url><loc>https://example.com/</loc></url>",
      ].join(""),
    );
  });

  it("returns the sitemap unchanged without paths", () => {
    expect(restoreTrailingSlashes(xml, new Set())).toBe(xml);
  });
});
