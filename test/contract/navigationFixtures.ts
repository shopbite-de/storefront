import { createMemoryBackend, demoSeed } from "../../server/adapters/memory";
import {
  createShopwareBackend,
  type StoreApi,
} from "../../server/adapters/shopware";
import type { Media, MenuSection, NavigationNode } from "../../shared/domain";
import type { AdapterFixture } from "./harness";
import type { NavigationScenario } from "./navigation.contract";

/** The memory adapter, seeded with the scenario's menu and navigations. */
export const memoryNavigation: AdapterFixture<NavigationScenario> = {
  adapter: "memory",
  create: (scenario) => {
    const demo = demoSeed();
    const { children, ...root } = scenario.menuRoot;
    return createMemoryBackend({
      ...demo,
      catalog: {
        ...demo.catalog,
        menuRoot: root,
        sections: children,
        offMenuSections: [],
      },
      navigation: {
        main: scenario.main,
        footer: scenario.footer,
        formerPaths: scenario.formerPaths,
        lastModified: scenario.lastModified,
      },
    });
  },
};

/* ------------------------------------------------------------------ */
/* Shopware: a fake Store API answering the scenario as Shopware does  */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;
type SeoUrlRow = {
  foreignKey: string;
  routeName: string;
  pathInfo: string;
  seoPathInfo: string;
  isCanonical: true | null;
  languageId: string;
  id: string;
};
type Filter = { type: string; field: string; value: unknown };

export const LANGUAGE = "2fbb5fe2e29a4d70aa5854ce7ce3e20b";
export const CATEGORY_ROUTE = "frontend.navigation.page";

function walk(sections: readonly MenuSection[]): MenuSection[] {
  return sections.flatMap((entry) => [entry, ...walk(entry.children)]);
}

function swMedia(media: Media | null) {
  if (!media) return null;
  return {
    url: media.url,
    alt: media.alt,
    metaData: { width: media.width, height: media.height },
    thumbnails: media.sources.map((source) => ({
      url: source.url,
      width: source.width,
    })),
  };
}

/** A navigation entry as the category Shopware keeps for it. */
function categoryOfNode(entry: NavigationNode): Json {
  const customFields = entry.icon ? { shopbite_category_icon: entry.icon } : {};
  return {
    id: entry.id,
    name: entry.label,
    translated: { name: entry.label, customFields },
    customFields,
    type:
      entry.kind === "group"
        ? "folder"
        : entry.kind === "menu-section"
          ? "page"
          : "link",
    // folders have no URL; links carry their target, pages their SEO URL
    seoUrl: entry.path,
    linkNewTab: entry.kind === "link" ? entry.external : null,
    children: entry.children.map(categoryOfNode),
  };
}

/** A menu section as its category, up to `depth` levels of children. */
function categoryOfSection(
  entry: MenuSection,
  depth: number,
  updatedAt: string | undefined,
  lastModified: NavigationScenario["lastModified"],
  withMedia: boolean,
): Json {
  const customFields = entry.icon ? { shopbite_category_icon: entry.icon } : {};
  return {
    id: entry.id,
    name: entry.name,
    translated: { name: entry.name, customFields },
    customFields,
    type: "page",
    seoUrl: entry.path,
    linkNewTab: null,
    createdAt: "2025-01-01T00:00:00.000+00:00",
    updatedAt: updatedAt ?? null,
    ...(withMedia && { media: swMedia(entry.media) }),
    children:
      depth > 1
        ? entry.children.map((child) =>
            categoryOfSection(
              child,
              depth - 1,
              lastModified[child.id],
              lastModified,
              withMedia,
            ),
          )
        : null,
  };
}

const lower = (value: unknown) => String(value).toLowerCase();

/** How Shopware's `equals` compares (MySQL: case-insensitive collation). */
function rowMatches(row: SeoUrlRow, filter: Filter): boolean {
  const value = row[filter.field as keyof SeoUrlRow];
  if (filter.value === null) return value === null;
  if (typeof filter.value === "boolean") return value === filter.value;
  return lower(value) === lower(filter.value);
}

export type ShopwareNavigationFake = {
  storeApi: StoreApi;
  /** The Store API requests made, `GET /path` or `POST /path`. */
  requests: string[];
};

/**
 * A fake Store API with the scenario as Shopware 6 with the ShopBite
 * plugin answers it: navigations (default depth 2, `depth` and `buildTree`
 * honoured, media only when included), breadcrumbs below the navigation
 * root, SEO URLs with canonical and former (`isCanonical: null`) rows that
 * the Store API returns only when the criteria filter on `isCanonical`.
 */
export function shopwareNavigationFake(
  scenario: NavigationScenario,
  extraSeoUrls: readonly SeoUrlRow[] = [],
): ShopwareNavigationFake {
  const requests: string[] = [];
  const root = scenario.menuRoot;
  const sections = walk([root]);
  const rows: SeoUrlRow[] = [
    ...sections.map((entry) => ({
      id: `seo-${entry.id}`,
      foreignKey: entry.id,
      routeName: CATEGORY_ROUTE,
      pathInfo: `/navigation/${entry.id}`,
      seoPathInfo: entry.path!.slice(1),
      isCanonical: true as const,
      languageId: LANGUAGE,
    })),
    ...Object.entries(scenario.formerPaths).flatMap(([id, paths]) =>
      paths.map((path, index) => ({
        id: `seo-old-${index}-${id}`,
        foreignKey: id,
        routeName: CATEGORY_ROUTE,
        pathInfo: `/navigation/${id}`,
        seoPathInfo: path.slice(1),
        isCanonical: null,
        languageId: LANGUAGE,
      })),
    ),
    ...extraSeoUrls,
  ].sort((a, b) => a.id.localeCompare(b.id));

  const seoUrls = (body: Json) => {
    const filters = (body.filter as Filter[] | undefined) ?? [];
    const asksCanonical = filters.some((f) => f.field === "isCanonical");
    const found = rows.filter(
      (row) =>
        (asksCanonical || row.isCanonical === true) &&
        filters.every((filter) => rowMatches(row, filter)),
    );
    const limit = Number(body.limit ?? 100);
    const page = Number(body.page ?? 1);
    return { elements: found.slice((page - 1) * limit, page * limit) };
  };

  const navigation = (rootId: string, body: Json) => {
    const includes = (body.includes as { category?: string[] } | undefined)
      ?.category;
    const withMedia = Boolean(includes?.includes("media"));
    const depth = Number(body.depth ?? 2);
    if (rootId === "main-navigation") {
      if (body.buildTree === false) {
        // the sitemap's flat list: every page below the root
        return sections.map((entry) => ({
          ...categoryOfSection(
            entry,
            1,
            scenario.lastModified[entry.id],
            scenario.lastModified,
            true,
          ),
          children: null,
        }));
      }
      return scenario.main.map(categoryOfNode);
    }
    if (rootId === "footer-navigation") {
      return scenario.footer.map(categoryOfNode);
    }
    const owner = sections.find((entry) => entry.id === rootId);
    if (!owner) {
      throw Object.assign(new Error("Category not found"), {
        name: "FetchError",
        statusCode: 404,
        status: 404,
      });
    }
    const children = owner.children.map((child) =>
      categoryOfSection(
        child,
        depth,
        scenario.lastModified[child.id],
        scenario.lastModified,
        withMedia,
      ),
    );
    if (body.buildTree === false) {
      return walk(owner.children).map((entry) => ({
        ...categoryOfSection(
          entry,
          1,
          scenario.lastModified[entry.id],
          scenario.lastModified,
          true,
        ),
        children: null,
      }));
    }
    return children;
  };

  const breadcrumb = (id: string) => {
    const trail = (
      list: readonly MenuSection[],
      path: MenuSection[],
    ): MenuSection[] | null => {
      for (const entry of list) {
        const here = [...path, entry];
        if (entry.id === id) return here;
        const below = trail(entry.children, here);
        if (below) return below;
      }
      return null;
    };
    return (trail([root], []) ?? []).map((entry) => ({
      name: entry.name,
      categoryId: entry.id,
      type: "page",
      translated: { customFields: {} },
      path: entry.path!.slice(1),
      seoUrls: [
        {
          pathInfo: `/navigation/${entry.id}`,
          seoPathInfo: entry.path!.slice(1),
        },
      ],
    }));
  };

  const storeApi: StoreApi = {
    get: async <T>(path: string, options?: { query?: Json }) => {
      requests.push(`GET ${path}`);
      if (path === "/shopbite/config") {
        return { isCheckoutEnabled: true, menuCategoryId: root.id } as T;
      }
      const match = path.match(/^\/breadcrumb\/([^/]+)$/);
      if (match && options?.query?.type === "category") {
        return structuredClone(breadcrumb(match[1]!)) as T;
      }
      throw new Error(`unexpected GET ${path}`);
    },
    post: async <T>(path: string, body: Json) => {
      requests.push(`POST ${path}`);
      if (path === "/seo-url") return structuredClone(seoUrls(body)) as T;
      const match = path.match(/^\/navigation\/([^/]+)\/([^/]+)$/);
      if (match) {
        return structuredClone(navigation(match[2]!, body)) as T;
      }
      throw new Error(`unexpected POST ${path}`);
    },
  };
  return { storeApi, requests };
}

export const shopwareNavigation: AdapterFixture<NavigationScenario> = {
  adapter: "shopware",
  create: (scenario) =>
    createShopwareBackend({
      storeApi: shopwareNavigationFake(scenario).storeApi,
      storeUrl: "https://nord.example.com",
      timeZone: "Europe/Berlin",
      log: () => {},
    }),
};
