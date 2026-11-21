import { describe, expect, it } from "vitest";
import {
  restoreTrailingSlashes,
  toSitemapUrls,
} from "../../server/utils/sitemap";

describe("toSitemapUrls", () => {
  it("maps section paths with change date, photo and slash marker", () => {
    expect(
      toSitemapUrls([
        {
          path: "/c/Pizza/",
          lastModified: "2025-11-17T10:00:00.000+00:00",
          image: "https://cdn.example.com/pizza.webp",
        },
        { path: "/Salate", lastModified: null, image: null },
      ]),
    ).toEqual([
      {
        loc: "/c/Pizza/",
        lastmod: "2025-11-17T10:00:00.000+00:00",
        images: [{ loc: "https://cdn.example.com/pizza.webp" }],
        _trailingSlash: true,
      },
      { loc: "/Salate" },
    ]);
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
