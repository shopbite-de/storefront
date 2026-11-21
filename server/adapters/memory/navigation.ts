import {
  decodePath,
  deepFreeze,
  DomainError,
  isHostilePath,
  routeTo,
  toggleTrailingSlash,
  type BreadcrumbItem,
  type Id,
  type MenuSection,
  type NavigationNode,
  type ResolvedRoute,
} from "../../../shared/domain";
import type { NavigationPort } from "../../ports";
import { walk, type MemoryCatalog } from "./catalog";

/** The header and footer of the memory shop and the history of its paths. */
export type MemoryNavigation = Readonly<{
  /** The header navigation. */
  main: readonly NavigationNode[];
  /** The footer columns. */
  footer: readonly NavigationNode[];
  /** Paths a section had before a rename, by section. */
  formerPaths: Readonly<Record<Id, readonly string[]>>;
  /** When a section last changed (ISO 8601), by section. */
  lastModified: Readonly<Record<Id, string>>;
}>;

const sameSpelling = (a: string, b: string) => decodePath(a) === decodePath(b);
const sameIgnoringCase = (a: string, b: string) =>
  decodePath(a).toLowerCase() === decodePath(b).toLowerCase();

/** A menu section as a navigation entry, with its sub-sections. */
export function toNode(section: MenuSection): NavigationNode {
  return {
    id: section.id,
    label: section.name,
    kind: "menu-section",
    path: section.path,
    external: false,
    icon: section.icon,
    media: null,
    children: section.children.map(toNode),
  };
}

/**
 * NavigationPort over the memory menu: the sections and their paths come
 * from the catalog seed, header, footer and former paths from the
 * navigation seed. A path resolves like a case-insensitive lookup that is
 * exact on the trailing slash: other spellings redirect to the canonical
 * path, so do the paths a section had before.
 */
export function createMemoryNavigation(
  catalog: MemoryCatalog,
  seed: MemoryNavigation,
): NavigationPort {
  const state = deepFreeze(structuredClone({ catalog, seed }));
  const menu = state.catalog;
  const root: MenuSection | null = menu.menuRoot
    ? { ...menu.menuRoot, children: menu.sections }
    : null;
  const onMenu = walk(root ? [root] : menu.sections);
  const sections = [...onMenu, ...walk(menu.offMenuSections)].filter(
    (section) => section.path,
  );
  const formerPaths = Object.entries(state.seed.formerPaths).flatMap(
    ([sectionId, paths]) => paths.map((path) => ({ sectionId, path })),
  );

  /** The section whose path matches; `spelled` on top of the case. */
  function findSection(path: string, spelled: boolean) {
    return sections.find((section) =>
      (spelled ? sameSpelling : sameIgnoringCase)(section.path!, path),
    );
  }

  function resolve(path: string): ResolvedRoute | null {
    const toggled = toggleTrailingSlash(path);
    const section =
      findSection(path, true) ??
      findSection(path, false) ??
      findSection(toggled, false);
    if (section) return routeTo(path, section.id, section.path!);
    const former = formerPaths.find(
      (entry) =>
        sameIgnoringCase(entry.path, path) ||
        sameIgnoringCase(entry.path, toggled),
    );
    const current = former && sections.find((s) => s.id === former.sectionId);
    return current ? routeTo(path, current.id, current.path!) : null;
  }

  function trail(
    list: readonly MenuSection[],
    sectionId: Id,
    above: MenuSection[] = [],
  ): MenuSection[] | null {
    for (const section of list) {
      const here = [...above, section];
      if (section.id === sectionId) return here;
      const below = trail(section.children, sectionId, here);
      if (below) return below;
    }
    return null;
  }

  return {
    getNavigation: async (kind) => {
      switch (kind) {
        case "main":
          return state.seed.main;
        case "footer":
          return state.seed.footer;
        case "menu":
          return deepFreeze(menu.sections.map(toNode));
        case "home":
          return deepFreeze(
            menu.sections.map((section) => ({
              ...toNode(section),
              media: section.media,
              children: [],
            })),
          );
      }
    },
    getMenuRootId: async () => {
      if (!root) {
        throw new DomainError("not_found", "The memory menu has no root.");
      }
      return root.id;
    },
    getBreadcrumb: async (sectionId) => {
      const found = trail(root ? [root] : menu.sections, sectionId);
      if (!found) {
        throw new DomainError(
          "not_found",
          `Section ${sectionId} is not on the menu.`,
          { sectionId },
        );
      }
      return deepFreeze(
        found.map((section): BreadcrumbItem => ({
          label: section.name,
          path: section.path ?? "/",
        })),
      );
    },
    resolvePath: async (path) =>
      isHostilePath(path) ? null : deepFreeze(resolve(path)),
    listSitemapEntries: async () =>
      deepFreeze(
        onMenu
          .filter((section) => section.path)
          .map((section) => ({
            path: section.path!,
            lastModified: state.seed.lastModified[section.id] ?? null,
            image: section.media?.url ?? null,
          })),
      ),
    listKnownPaths: async () =>
      deepFreeze({
        current: sections.map((section) => section.path!),
        former: formerPaths.map((entry) => entry.path),
        unlistedPrefixes: [],
      }),
  };
}
