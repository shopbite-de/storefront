import type { Media } from "../../shared/domain";

/**
 * Navigation media still come as Shopware media until the Navigation
 * context moves (ADR 0001, step 3): thumbnails and meta data instead of
 * the domain's sources and size.
 */
type NavigationMedia = {
  url?: string;
  thumbnails?: { url?: string; width?: number }[] | null;
  metaData?: { width?: number; height?: number } | null;
};

const isDomainMedia = (media: Media | NavigationMedia): media is Media =>
  "sources" in media;

/**
 * `srcset` from the renditions of an image (e.g. 400, 800 and 1920 px
 * wide), so the browser picks the size it needs instead of the original
 * (#273). Returns `undefined` without renditions.
 */
export function mediaSrcSet(
  media: Media | NavigationMedia | null | undefined,
): string | undefined {
  if (!media) return undefined;
  const renditions = isDomainMedia(media)
    ? media.sources
    : (media.thumbnails ?? []);
  const entries = renditions
    .filter(
      (rendition): rendition is { url: string; width: number } =>
        Boolean(rendition.url) && Boolean(rendition.width),
    )
    .sort((a, b) => a.width - b.width)
    .map((rendition) => `${rendition.url} ${rendition.width}w`);

  return entries.length ? entries.join(", ") : undefined;
}

/** Intrinsic size of an image for `width`/`height` attributes (no layout shift). */
export function mediaSize(
  media: Media | NavigationMedia | null | undefined,
): { width: number; height: number } | undefined {
  if (!media) return undefined;
  const { width, height } = isDomainMedia(media)
    ? media
    : (media.metaData ?? {});
  return width && height ? { width, height } : undefined;
}
