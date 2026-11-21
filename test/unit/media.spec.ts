import { describe, expect, it } from "vitest";
import { mediaSize, mediaSrcSet } from "../../app/utils/media";

describe("mediaSrcSet", () => {
  it("lists the renditions of a dish's media by width", () => {
    expect(
      mediaSrcSet({
        url: "https://cdn.example.com/21.webp",
        alt: null,
        width: 1200,
        height: 900,
        sources: [
          { url: "https://cdn.example.com/21-800.webp", width: 800 },
          { url: "https://cdn.example.com/21-400.webp", width: 400 },
        ],
      }),
    ).toBe(
      "https://cdn.example.com/21-400.webp 400w, https://cdn.example.com/21-800.webp 800w",
    );
    expect(
      mediaSize({
        url: "x",
        alt: null,
        width: 1200,
        height: 900,
        sources: [],
      }),
    ).toEqual({ width: 1200, height: 900 });
  });

  it("returns undefined without renditions", () => {
    const media = { url: "x", alt: null, width: null, height: null };
    expect(mediaSrcSet({ ...media, sources: [] })).toBeUndefined();
    expect(mediaSrcSet(undefined)).toBeUndefined();
  });
});

describe("mediaSize", () => {
  it("returns the intrinsic size, undefined without both sides", () => {
    const media = { url: "x", alt: null, sources: [] };
    expect(mediaSize({ ...media, width: 4928, height: 1400 })).toEqual({
      width: 4928,
      height: 1400,
    });
    expect(mediaSize({ ...media, width: 4928, height: null })).toBeUndefined();
    expect(mediaSize(null)).toBeUndefined();
  });
});
