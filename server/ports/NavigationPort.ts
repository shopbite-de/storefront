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
  /**
   * A navigation in its order: `main` (header), `footer` (columns of
   * links), `menu` (the menu sections below the menu root, with their
   * sub-sections) and `home` (the menu sections with their photo). For
   * `menu` and `home`, `menuRootId` is the root the storefront resolved
   * (`getMenuRootId`, cached), so key and tree never name two roots;
   * without it the adapter asks for its root itself.
   */
  getNavigation(
    kind: NavigationKind,
    menuRootId?: Id,
  ): Promise<readonly NavigationNode[]>;
  /**
   * The menu section the menu hangs from (its page lists every dish).
   * Rejects when the backend cannot tell, never answers a guess.
   */
  getMenuRootId(): Promise<Id>;
  /** The path to a menu section, outermost first. Throws `not_found`. */
  getBreadcrumb(sectionId: Id): Promise<readonly BreadcrumbItem[]>;
  /**
   * What a path stands for: a section (with its canonical path) or a
   * redirect for an old or differently spelled path (other case, toggled
   * trailing slash), built with `routeTo()`. Null: no such path, also for
   * a path no section can have (`isHostilePath`), which is rejected
   * before any lookup. A path it resolves (other than under
   * `KnownPaths.unlistedPrefixes`) is among the known paths up to case,
   * accents and outer slashes (`pathKey`).
   */
  resolvePath(path: string): Promise<ResolvedRoute | null>;
  /** Paths of all menu sections for the sitemap. */
  listSitemapEntries(): Promise<readonly SitemapEntry[]>;
  /**
   * Every current and former path of a menu section, so the storefront can
   * answer a path no section ever had with a 404 without asking further
   * (requests of vulnerability scanners). Null when there are too many to
   * list; then every path may be one.
   */
  listKnownPaths(): Promise<KnownPaths | null>;
}
