import type { Media } from "../../shared/domain";

/**
 * `srcset` from the renditions of an image (e.g. 400, 800 and 1920 px
 * wide), so the browser picks the size it needs instead of the original
 * (#273). Returns `undefined` without renditions.
 */
export function mediaSrcSet(
  media: Media | null | undefined,
): string | undefined {
  if (!media) return undefined;
  const entries = media.sources
    .filter((rendition) => Boolean(rendition.url) && Boolean(rendition.width))
    .sort((a, b) => a.width - b.width)
    .map((rendition) => `${rendition.url} ${rendition.width}w`);

  return entries.length ? entries.join(", ") : undefined;
}

/** Intrinsic size of an image for `width`/`height` attributes (no layout shift). */
export function mediaSize(
  media: Media | null | undefined,
): { width: number; height: number } | undefined {
  if (!media) return undefined;
  const { width, height } = media;
  return width && height ? { width, height } : undefined;
}
