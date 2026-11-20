/** One rendition of an image, for `srcset`. */
export type MediaSource = Readonly<{ url: string; width: number }>;

/**
 * An image of a dish, menu section or the shop: the original plus smaller
 * renditions, so the browser picks the size it needs. Building `srcset`
 * from it is presentation (app utils).
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
