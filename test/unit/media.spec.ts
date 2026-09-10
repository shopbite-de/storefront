import { describe, expect, it } from "vitest";
import { mediaSize, mediaSrcSet } from "../../app/utils/media";

describe("mediaSrcSet", () => {
  it("lists the thumbnails by width", () => {
    expect(
      mediaSrcSet({
        url: "https://cdn.example.com/media/pizza.webp",
        thumbnails: [
          {
            url: "https://cdn.example.com/thumbnail/pizza_1920x545.webp",
            width: 1920,
          },
          {
            url: "https://cdn.example.com/thumbnail/pizza_400x114.webp",
            width: 400,
          },
          {
            url: "https://cdn.example.com/thumbnail/pizza_800x227.webp",
            width: 800,
          },
        ],
      }),
    ).toBe(
      "https://cdn.example.com/thumbnail/pizza_400x114.webp 400w, https://cdn.example.com/thumbnail/pizza_800x227.webp 800w, https://cdn.example.com/thumbnail/pizza_1920x545.webp 1920w",
    );
  });

  it("skips incomplete thumbnails and returns undefined without any", () => {
    expect(
      mediaSrcSet({ thumbnails: [{ url: "x" }, { width: 400 }] }),
    ).toBeUndefined();
    expect(mediaSrcSet({ thumbnails: [] })).toBeUndefined();
    expect(mediaSrcSet({ thumbnails: null })).toBeUndefined();
    expect(mediaSrcSet(undefined)).toBeUndefined();
  });
});

describe("mediaSize", () => {
  it("returns the intrinsic size from the meta data", () => {
    expect(mediaSize({ metaData: { width: 4928, height: 1400 } })).toEqual({
      width: 4928,
      height: 1400,
    });
    expect(mediaSize({ metaData: { width: 4928 } })).toBeUndefined();
    expect(mediaSize({ metaData: null })).toBeUndefined();
    expect(mediaSize(null)).toBeUndefined();
  });
});
