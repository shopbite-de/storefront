import type { Id, Media } from "../kernel";

/** Which navigation of the shop: header, footer, menu index, home page. */
export type NavigationKind = "main" | "footer" | "menu" | "home";

export const NAVIGATION_KINDS: readonly NavigationKind[] = [
  "main",
  "footer",
  "menu",
  "home",
];

/**
 * An entry of a navigation: a menu section, a content page, a link or a
 * group of entries (a footer column).
 */
export type NavigationNode = Readonly<{
  id: Id;
  label: string;
  kind: "menu-section" | "page" | "link" | "group";
  /**
   * Storefront path, or an absolute URL for `link`; null for a group,
   * which only heads its children.
   */
  path: string | null;
  /** Opens in a new tab. */
  external: boolean;
  icon: string | null;
  /** The photo of a menu section; only the home navigation carries it. */
  media: Media | null;
  children: readonly NavigationNode[];
}>;

/** One step of the path to a menu section ("Speisekarte › Pizza"). */
export type BreadcrumbItem = Readonly<{ label: string; path: string }>;

/**
 * What a storefront path stands for. Paths belong to the storefront, not to
 * the backend: the adapter only tells which section a path names and which
 * path is the canonical one.
 */
export type ResolvedRoute =
  | Readonly<{
      kind: "menu-section";
      sectionId: Id;
      /** The path to link and canonicalise to. */
      canonicalPath: string;
    }>
  | Readonly<{
      kind: "redirect";
      /** An old or differently spelled path of a section: 301 to this. */
      to: string;
      /** The section the path leads to. */
      sectionId: Id;
    }>;

/** A URL for the sitemap. */
export type SitemapEntry = Readonly<{
  path: string;
  /** ISO 8601 date-time. */
  lastModified: string | null;
  /** URL of the section's photo, if any. */
  image: string | null;
}>;

/** The paths menu sections have now and had before (redirects). */
export type KnownPaths = Readonly<{
  current: readonly string[];
  former: readonly string[];
  /**
   * Paths under these prefixes resolve without being listed (Shopware's
   * technical URLs such as `/navigation/<id>`).
   */
  unlistedPrefixes: readonly string[];
}>;
