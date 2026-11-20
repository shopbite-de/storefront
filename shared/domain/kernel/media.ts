/** One rendition of an image, for `srcset`. */
export type MediaSource = Readonly<{ url: string; width: number }>;

/**
 * An image of a dish, menu section or the shop: the original plus smaller
 * renditions, so the browser picks the size it needs.
 */
export type Media = Readonly<{
  url: string;
  alt: string | null;
  /** Intrinsic size, for `width`/`height` attributes (no layout shift). */
  width: number | null;
  height: number | null;
  /** Renditions, any order. */
  sources: readonly MediaSource[];
}>;

/** `srcset` of a media (narrowest first), `undefined` without renditions. */
export function mediaSrcSet(
  media: Media | null | undefined,
): string | undefined {
  const sources = [...(media?.sources ?? [])].sort((a, b) => a.width - b.width);
  return sources.length
    ? sources.map((source) => `${source.url} ${source.width}w`).join(", ")
    : undefined;
}
