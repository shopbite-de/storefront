import {
  deepFreeze,
  DomainError,
  isHostilePath,
  routeTo,
  toggleTrailingSlash,
  type BreadcrumbItem,
  type KnownPaths,
  type NavigationKind,
  type NavigationNode,
  type ResolvedRoute,
  type SitemapEntry,
} from "../../../shared/domain";
import type { NavigationPort } from "../../ports";
import { toMedia } from "./catalog";
import { menuRootReader, NAVIGATION_ROOT } from "./menuRoot";
import { request } from "./request";
import { text } from "./shop";
import type { StoreApi } from "./storeApi";

/*
 * Everything about Shopware's SEO URLs stays here: `seoPathInfo` and
 * `pathInfo`, technical URLs (`/navigation/<id>`), canonical and former
 * SEO URLs (`isCanonical: null`), the navigation roots and the category
 * types. The storefront sees paths, navigation nodes and routes.
 */

type Translated<T> = T & { translated?: Partial<T> | null };
type SwCategory = Translated<{
  id: string;
  name?: string | null;
  seoUrl?: string | null;
  customFields?: Record<string, unknown> | null;
}> & {
  type?: string;
  linkNewTab?: boolean | null;
  media?: Parameters<typeof toMedia>[0];
  children?: SwCategory[] | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};
type SwSeoUrl = {
  foreignKey?: string;
  routeName?: string;
  pathInfo?: string;
  seoPathInfo?: string;
  languageId?: string;
};
type SwBreadcrumb = { name?: string | null; path?: string | null };

const ICON_FIELD = "shopbite_category_icon";
/** The route of a category page; products (`frontend.detail.page`) have no page (#289). */
const CATEGORY_ROUTE = "frontend.navigation.page";

/** What the header, footer and menu navigation read. */
const NAVIGATION_CRITERIA = {
  includes: {
    category: [
      "id",
      "name",
      "translated",
      "seoUrl",
      "customFields",
      "children",
      "linkNewTab",
      "type",
    ],
  },
};

/** The menu sections of the home page with their photo. */
const HOME_CRITERIA = {
  depth: 1,
  includes: {
    category: [
      "id",
      "name",
      "translated",
      "seoUrl",
      "customFields",
      "media",
      "type",
    ],
    media: ["url", "thumbnails", "metaData"],
    media_thumbnail: ["url", "width"],
  },
};

const SITEMAP_CRITERIA = {
  depth: 10,
  // flat list: in a tree, children would be dropped by the includes below
  buildTree: false,
  includes: {
    category: ["seoUrl", "type", "updatedAt", "createdAt", "media"],
    media: ["url"],
  },
  associations: { media: {} },
};

const SEO_URL_INCLUDES = {
  seo_url: ["foreignKey", "routeName", "pathInfo", "seoPathInfo", "languageId"],
};

/** Technical URLs (`/navigation/<id>`) are looked up by `pathInfo`. */
export const TECHNICAL_PREFIXES = ["/navigation/", "/detail/", "/landingPage/"];

export function isTechnicalPath(path: string): boolean {
  return TECHNICAL_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** The only shape of a technical URL: prefix, entity id, optional slash. */
const TECHNICAL_URL = /^\/(navigation|detail|landingPage)\/[0-9a-f]{32}\/?$/i;

/**
 * Paths no SEO URL can have, answered without a lookup: the storefront's
 * hostile paths and technical prefixes without an entity id
 * (`/navigation/zzz`).
 */
export function isHostileShopwarePath(path: string): boolean {
  return (
    isHostilePath(path) || (isTechnicalPath(path) && !TECHNICAL_URL.test(path))
  );
}

/**
 * What Shopware compares a path with: technical URLs by `pathInfo`
 * (without the trailing slash), SEO URLs by `seoPathInfo` (without the
 * leading one).
 */
export function seoUrlLookup(path: string): {
  field: "pathInfo" | "seoPathInfo";
  value: string;
} {
  return isTechnicalPath(path)
    ? { field: "pathInfo", value: path.replace(/\/$/, "") }
    : { field: "seoPathInfo", value: path.substring(1) };
}

/** Shopware's default MAX_LIMIT of the Store API. */
export const SEO_PATH_PAGE_SIZE = 100;
const MAX_SEO_PATH_PAGES = 10;

/** Store API criteria for one page of category SEO URLs. */
export function seoPathCriteria(isCanonical: true | null, page: number) {
  return {
    limit: SEO_PATH_PAGE_SIZE,
    // `/seo-url` pages with `page`; `p` is ignored there
    page,
    // a stable order, so pages neither skip nor repeat rows
    sort: [{ field: "id", order: "ASC" }],
    filter: [
      { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
      // the Store API returns old SEO URLs only when the criteria filter on
      // `isCanonical`
      { type: "equals", field: "isCanonical", value: isCanonical },
    ],
    includes: { seo_url: ["seoPathInfo"] },
  };
}

const withLeadingSlash = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

function translated<T extends object, K extends keyof T>(
  entity: Translated<T> | null | undefined,
  key: K,
): T[K] | undefined {
  return (entity?.translated?.[key] ?? entity?.[key]) as T[K] | undefined;
}

const KINDS: Readonly<Record<string, NavigationNode["kind"]>> = {
  page: "menu-section",
  link: "link",
  folder: "group",
};

/**
 * A category as a navigation entry: pages are menu sections, links keep
 * their target (another category's SEO URL, an external URL or a
 * storefront path such as `/kontakt`), folders head their children.
 */
export function toNavigationNode(category: SwCategory): NavigationNode {
  return {
    id: category.id,
    label: translated(category, "name") ?? "",
    kind: KINDS[category.type ?? "page"] ?? "link",
    path: translated(category, "seoUrl") ?? null,
    external: category.linkNewTab === true,
    icon: text(translated(category, "customFields")?.[ICON_FIELD]),
    media: toMedia(category.media),
    children: (category.children ?? []).map(toNavigationNode),
  };
}

/** Pages with a SEO URL; technical `/navigation/<id>` URLs are left out. */
export function toSitemapEntries(categories: SwCategory[]): SitemapEntry[] {
  const entries = new Map<string, SitemapEntry>();
  for (const category of categories) {
    const path = category.seoUrl;
    if (
      category.type !== "page" ||
      !path?.startsWith("/") ||
      path.startsWith("//") ||
      path.startsWith("/navigation/") ||
      entries.has(path)
    ) {
      continue;
    }
    entries.set(path, {
      path,
      lastModified: category.updatedAt ?? category.createdAt ?? null,
      image: category.media?.url ?? null,
    });
  }
  return [...entries.values()];
}

export type ShopwareNavigationOptions = Readonly<{
  /** `public.shopBite.menuCategoryId`: overrides the plugin's menu root. */
  menuCategoryId?: string;
}>;

/**
 * NavigationPort over the Store API: the sales channel's `main-navigation`
 * and `footer-navigation`, the menu root of the ShopBite plugin, the
 * `/breadcrumb` route and the SEO URLs. No caching here (ADR 0001): the
 * BFF caches navigations, breadcrumbs, path routes and the known paths.
 */
export function createShopwareNavigation(
  storeApi: StoreApi,
  options: ShopwareNavigationOptions = {},
): NavigationPort {
  const menuRoot = menuRootReader(storeApi, options.menuCategoryId);

  const navigation = (
    what: string,
    activeId: string,
    rootId: string,
    criteria: Record<string, unknown>,
    headers?: Record<string, string>,
  ) =>
    request(what, () =>
      storeApi.post<SwCategory[]>(
        `/navigation/${activeId}/${rootId}`,
        criteria,
        headers && { headers },
      ),
    );

  async function treeOf(kind: NavigationKind): Promise<SwCategory[]> {
    switch (kind) {
      case "main":
        return navigation(
          "the main navigation",
          NAVIGATION_ROOT,
          NAVIGATION_ROOT,
          NAVIGATION_CRITERIA,
        );
      case "footer":
        return navigation(
          "the footer navigation",
          "footer-navigation",
          "footer-navigation",
          NAVIGATION_CRITERIA,
        );
      case "menu":
      case "home":
        return navigation(
          `the ${kind} navigation`,
          NAVIGATION_ROOT,
          await menuRoot(),
          kind === "home" ? HOME_CRITERIA : NAVIGATION_CRITERIA,
        );
    }
  }

  /** The first SEO URL the criteria find. */
  const firstSeoUrl = async (
    filter: { type: "equals"; field: string; value: string | boolean | null }[],
  ): Promise<SwSeoUrl | null> => {
    const result = await request("the SEO URLs", () =>
      storeApi.post<{ elements?: SwSeoUrl[] }>("/seo-url", {
        limit: 1,
        filter,
        includes: SEO_URL_INCLUDES,
      }),
    );
    return result.elements?.[0] ?? null;
  };

  /** The canonical SEO URL of a category at this path (any case). */
  async function currentCategory(path: string): Promise<SwSeoUrl | null> {
    const { field, value } = seoUrlLookup(path);
    const match = await firstSeoUrl([{ type: "equals", field, value }]);
    return match?.routeName === CATEGORY_ROUTE ? match : null;
  }

  /**
   * The current SEO URL of the category an old SEO URL belonged to.
   * Shopware keeps old SEO URLs with `isCanonical: null`; the Store API
   * returns them only when the criteria filter on `isCanonical`.
   */
  async function formerCategory(path: string): Promise<SwSeoUrl | null> {
    const old = await firstSeoUrl([
      { type: "equals", field: "seoPathInfo", value: path.substring(1) },
      { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
      { type: "equals", field: "isCanonical", value: null },
    ]);
    if (!old?.foreignKey) return null;
    return firstSeoUrl([
      { type: "equals", field: "foreignKey", value: old.foreignKey },
      { type: "equals", field: "routeName", value: CATEGORY_ROUTE },
      { type: "equals", field: "languageId", value: old.languageId ?? null },
      { type: "equals", field: "isCanonical", value: true },
    ]);
  }

  const routeOf = (path: string, seoUrl: SwSeoUrl): ResolvedRoute | null =>
    seoUrl.foreignKey
      ? routeTo(
          path,
          seoUrl.foreignKey,
          seoUrl.seoPathInfo ? withLeadingSlash(seoUrl.seoPathInfo) : path,
        )
      : null;

  async function pathsOf(isCanonical: true | null): Promise<string[] | null> {
    const paths: string[] = [];
    for (let page = 1; page <= MAX_SEO_PATH_PAGES; page++) {
      const result = await request("the SEO paths", () =>
        storeApi.post<{ elements?: SwSeoUrl[] }>(
          "/seo-url",
          seoPathCriteria(isCanonical, page),
        ),
      );
      const elements = result.elements ?? [];
      paths.push(
        ...elements.map((seoUrl) => withLeadingSlash(seoUrl.seoPathInfo ?? "")),
      );
      if (elements.length < SEO_PATH_PAGE_SIZE) return paths;
    }
    return null;
  }

  return {
    getNavigation: async (kind) => {
      const tree = await treeOf(kind);
      return deepFreeze(tree.map(toNavigationNode));
    },
    getMenuRootId: () => menuRoot(),
    getBreadcrumb: async (sectionId) => {
      const crumbs = await request(`the breadcrumb of ${sectionId}`, () =>
        storeApi.get<SwBreadcrumb[]>(`/breadcrumb/${sectionId}`, {
          query: { type: "category" },
        }),
      );
      // Shopware answers an unknown id with an empty list
      if (!Array.isArray(crumbs) || !crumbs.length) {
        throw new DomainError(
          "not_found",
          `Shopware has no breadcrumb for ${sectionId}.`,
          { sectionId },
        );
      }
      return deepFreeze(
        crumbs.map((crumb): BreadcrumbItem => ({
          label: crumb.name ?? "",
          path: `/${crumb.path ?? ""}`,
        })),
      );
    },
    resolvePath: async (path) => {
      if (isHostileShopwarePath(path)) return null;
      // exact on the trailing slash, case-insensitive (#244, #291)
      const match = await currentCategory(path);
      if (match) return routeOf(path, match);
      const toggled = toggleTrailingSlash(path);
      const toggledMatch = await currentCategory(toggled);
      if (toggledMatch?.seoPathInfo) return routeOf(path, toggledMatch);
      // only for paths no current SEO URL has, with and without the slash
      const current =
        (await formerCategory(path)) ?? (await formerCategory(toggled));
      return current?.seoPathInfo ? routeOf(path, current) : null;
    },
    listSitemapEntries: async () => {
      // the menu root falls back to the navigation root: a sitemap without
      // the menu's own tree is better than none
      const rootIds = new Set([
        NAVIGATION_ROOT,
        await menuRoot().catch(() => NAVIGATION_ROOT),
      ]);
      const trees = await Promise.all(
        [...rootIds].map((rootId) =>
          navigation(
            `the sitemap of ${rootId}`,
            NAVIGATION_ROOT,
            rootId,
            SITEMAP_CRITERIA,
            { "sw-include-seo-urls": "true" },
          ),
        ),
      );
      return deepFreeze(toSitemapEntries(trees.flat()));
    },
    listKnownPaths: async () => {
      const [current, former] = await Promise.all([
        pathsOf(true),
        pathsOf(null),
      ]);
      if (!current || !former) return null;
      const known: KnownPaths = {
        current,
        former,
        unlistedPrefixes: TECHNICAL_PREFIXES,
      };
      return deepFreeze(known);
    },
  };
}
