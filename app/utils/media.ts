type Thumbnail = { url?: string; width?: number };
type Media = {
  url?: string;
  thumbnails?: Thumbnail[] | null;
  metaData?: { width?: number; height?: number } | null;
};

/**
 * `srcset` from the Shopware thumbnails of a media entity (e.g. 400, 800
 * and 1920 px wide), so the browser picks the size it needs instead of the
 * original (#273). Returns `undefined` without thumbnails.
 */
export function mediaSrcSet(
  media: Media | null | undefined,
): string | undefined {
  const entries = (media?.thumbnails ?? [])
    .filter(
      (thumbnail): thumbnail is { url: string; width: number } =>
        Boolean(thumbnail.url) && Boolean(thumbnail.width),
    )
    .sort((a, b) => a.width - b.width)
    .map((thumbnail) => `${thumbnail.url} ${thumbnail.width}w`);

  return entries.length ? entries.join(", ") : undefined;
}

/** Intrinsic size of a media entity for `width`/`height` attributes (no layout shift). */
export function mediaSize(
  media: Media | null | undefined,
): { width: number; height: number } | undefined {
  const { width, height } = media?.metaData ?? {};
  return width && height ? { width, height } : undefined;
}
