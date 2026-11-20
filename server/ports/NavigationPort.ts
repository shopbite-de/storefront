import type {
  BreadcrumbItem,
  KnownPaths,
  Id,
  NavigationKind,
  NavigationNode,
  ResolvedRoute,
  SitemapEntry,
} from "../../shared/domain";

/**
 * Discoverability: navigations, paths and the sitemap. Shop-wide.
 *
 * Paths are storefront paths. A backend with SEO URLs (Shopware) answers
 * from them, including old ones (redirects); a backend without them
 * (Sylius: taxon slugs) builds paths from slugs. Content pages of the
 * storefront itself (Nuxt Content) are not the backend's business.
 */
export interface NavigationPort {
  getNavigation(kind: NavigationKind): Promise<readonly NavigationNode[]>;
  /** The path to a menu section, outermost first. Throws `not_found`. */
  getBreadcrumb(sectionId: Id): Promise<readonly BreadcrumbItem[]>;
  /**
   * What a path stands for: a section (with its canonical path) or a
   * redirect for an old or differently spelled path. Null: no such path.
   */
  resolvePath(path: string): Promise<ResolvedRoute | null>;
  /** Paths of all menu sections for the sitemap. */
  listSitemapEntries(): Promise<readonly SitemapEntry[]>;
  /**
   * Every current and former path of a menu section, so the storefront can
   * answer a path no section ever had with a 404 without asking further
   * (requests of vulnerability scanners).
   */
  listKnownPaths(): Promise<KnownPaths>;
}
