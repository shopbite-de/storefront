import { expect, it } from "vitest";
import {
  isDomainError,
  type Id,
  type Media,
  type MenuSection,
  type NavigationNode,
} from "../../shared/domain";
import { defineContract } from "./harness";

/**
 * A shop's navigations and paths as the NavigationPort suite describes
 * them, in domain terms: the menu hangs from its root section, sections
 * keep the paths they had before a rename, the header and the footer list
 * what the restaurant put there.
 */
export type NavigationScenario = Readonly<{
  /** The menu root; its children are the menu's sections. */
  menuRoot: MenuSection;
  /** Paths a section had before (renamed), by section. */
  formerPaths: Readonly<Record<Id, readonly string[]>>;
  /** When a section last changed, by section. */
  lastModified: Readonly<Record<Id, string>>;
  /** The header navigation as the shop keeps it. */
  main: readonly NavigationNode[];
  /** The footer columns. */
  footer: readonly NavigationNode[];
}>;

const PHOTO: Media = {
  url: "https://cdn.example.com/pizza.webp",
  alt: null,
  width: 1600,
  height: 900,
  sources: [{ url: "https://cdn.example.com/pizza-800.webp", width: 800 }],
};

const section = (
  id: string,
  name: string,
  path: string,
  extra: Partial<MenuSection> = {},
): MenuSection => ({
  id,
  name,
  description: null,
  icon: null,
  media: null,
  path,
  seo: { title: null, description: null, indexable: true },
  children: [],
  ...extra,
});

const SPEZIAL = section(
  "0a000000000000000000000000000003",
  "Spezial",
  "/Speisekarte/Pizza/Spezial/",
);
const PIZZA = section(
  "0a000000000000000000000000000002",
  "Pizza",
  "/Speisekarte/Pizza/",
  { icon: "i-lucide-pizza", media: PHOTO, children: [SPEZIAL] },
);
const FISCH = section(
  "0a000000000000000000000000000004",
  "Fischgerichte",
  "/Speisekarte/Fischgerichte/",
  { icon: "i-lucide-fish" },
);
const ROOT = section(
  "0a000000000000000000000000000001",
  "Speisekarte",
  "/Speisekarte/",
  { icon: "i-lucide-utensils", children: [PIZZA, FISCH] },
);

const node = (
  from: MenuSection,
  children: readonly NavigationNode[] = [],
  media: Media | null = null,
): NavigationNode => ({
  id: from.id,
  label: from.name,
  kind: "menu-section",
  path: from.path,
  external: false,
  icon: from.icon,
  media,
  children,
});

const link = (
  id: string,
  label: string,
  path: string,
  external = false,
): NavigationNode => ({
  id,
  label,
  kind: "link",
  path,
  external,
  icon: null,
  media: null,
  children: [],
});

/** Menu sections as the menu navigation lists them (sub-sections below). */
const MENU: readonly NavigationNode[] = [
  node(PIZZA, [node(SPEZIAL)]),
  node(FISCH),
];

export const NAVIGATION_SCENARIO: NavigationScenario = {
  menuRoot: ROOT,
  formerPaths: { [FISCH.id]: ["/Speisekarte/Fisch/"] },
  lastModified: {
    [ROOT.id]: "2026-01-01T10:00:00.000+00:00",
    [PIZZA.id]: "2026-11-17T10:00:00.000+00:00",
    [SPEZIAL.id]: "2026-11-18T10:00:00.000+00:00",
    [FISCH.id]: "2026-11-19T10:00:00.000+00:00",
  },
  main: [
    node(ROOT, MENU),
    link("0b000000000000000000000000000001", "Kontakt", "/kontakt"),
    link(
      "0b000000000000000000000000000002",
      "Instagram",
      "https://instagram.example.com/restaurant",
      true,
    ),
  ],
  footer: [
    {
      id: "0c000000000000000000000000000001",
      label: "Beliebt",
      kind: "group",
      path: null,
      external: false,
      icon: null,
      media: null,
      children: [
        link(
          "0c000000000000000000000000000002",
          "Pizza",
          "/Speisekarte/Pizza/",
        ),
      ],
    },
    {
      id: "0c000000000000000000000000000003",
      label: "Rechtliches",
      kind: "group",
      path: null,
      external: false,
      icon: null,
      media: null,
      children: [
        link("0c000000000000000000000000000004", "Impressum", "/impressum"),
      ],
    },
  ],
};

const byPath = <T extends { path: string }>(entries: readonly T[]) =>
  [...entries].sort((a, b) => a.path.localeCompare(b.path));

export const navigationContract = defineContract<
  "navigation",
  NavigationScenario
>("navigation", (given) => {
  const port = () => given(NAVIGATION_SCENARIO);

  it("lists the header navigation", async () => {
    expect(await (await port()).getNavigation("main")).toEqual(
      NAVIGATION_SCENARIO.main,
    );
  });

  it("lists the footer columns with their links", async () => {
    expect(await (await port()).getNavigation("footer")).toEqual(
      NAVIGATION_SCENARIO.footer,
    );
  });

  it("lists the menu sections below the menu root, with sub-sections", async () => {
    expect(await (await port()).getNavigation("menu")).toEqual(MENU);
  });

  it("lists the menu below the root the storefront resolved", async () => {
    const navigation = await port();
    const root = await navigation.getMenuRootId();
    expect(await navigation.getNavigation("menu", root)).toEqual(MENU);
  });

  it("lists the menu sections with their photo for the home page", async () => {
    expect(await (await port()).getNavigation("home")).toEqual([
      node(PIZZA, [], PHOTO),
      node(FISCH),
    ]);
  });

  it("tells the menu root", async () => {
    expect(await (await port()).getMenuRootId()).toBe(ROOT.id);
  });

  it("answers the breadcrumb of a section, outermost first", async () => {
    const navigation = await port();
    expect(await navigation.getBreadcrumb(SPEZIAL.id)).toEqual([
      { label: "Speisekarte", path: "/Speisekarte/" },
      { label: "Pizza", path: "/Speisekarte/Pizza/" },
      { label: "Spezial", path: "/Speisekarte/Pizza/Spezial/" },
    ]);
    expect(await navigation.getBreadcrumb(ROOT.id)).toEqual([
      { label: "Speisekarte", path: "/Speisekarte/" },
    ]);
  });

  it("has no breadcrumb for an unknown section", async () => {
    const error = await (
      await port()
    )
      .getBreadcrumb("0f000000000000000000000000000000")
      .catch((caught: unknown) => caught);
    expect(isDomainError(error, "not_found")).toBe(true);
  });

  it("resolves a section's canonical path, the menu root's too", async () => {
    const navigation = await port();
    expect(await navigation.resolvePath("/Speisekarte/Pizza/")).toEqual({
      kind: "menu-section",
      sectionId: PIZZA.id,
      canonicalPath: "/Speisekarte/Pizza/",
    });
    expect(await navigation.resolvePath("/Speisekarte/")).toEqual({
      kind: "menu-section",
      sectionId: ROOT.id,
      canonicalPath: "/Speisekarte/",
    });
  });

  it("redirects other spellings to the canonical path", async () => {
    const navigation = await port();
    for (const path of [
      "/speisekarte/pizza/",
      "/SPEISEKARTE/PIZZA/",
      "/Speisekarte/Pizza",
      "/speisekarte/pizza",
    ]) {
      expect(await navigation.resolvePath(path), path).toEqual({
        kind: "redirect",
        to: "/Speisekarte/Pizza/",
        sectionId: PIZZA.id,
      });
    }
    expect(await navigation.resolvePath("/speisekarte")).toEqual({
      kind: "redirect",
      to: "/Speisekarte/",
      sectionId: ROOT.id,
    });
  });

  it("redirects a renamed section's former path to its current one", async () => {
    const navigation = await port();
    for (const path of [
      "/Speisekarte/Fisch/",
      "/Speisekarte/Fisch",
      "/speisekarte/fisch/",
      "/SPEISEKARTE/FISCH",
    ]) {
      expect(await navigation.resolvePath(path), path).toEqual({
        kind: "redirect",
        to: "/Speisekarte/Fischgerichte/",
        sectionId: FISCH.id,
      });
    }
  });

  it("knows no other path, not the storefront's content pages", async () => {
    const navigation = await port();
    for (const path of [
      "/Speisekarte/Unbekannt/",
      "/impressum",
      "/kontakt",
      "/wp-admin/",
      "/Speisekarte/Pizza/Spezial/x/",
    ]) {
      expect(await navigation.resolvePath(path), path).toBeNull();
    }
  });

  it("answers hostile paths with null", async () => {
    const navigation = await port();
    for (const path of [
      "/%ff",
      "/%252e%252e/etc/passwd",
      "/../etc/passwd",
      "/Speisekarte/%2e%2e/Pizza/",
      `/${"a".repeat(800)}`,
    ]) {
      expect(await navigation.resolvePath(path), path).toBeNull();
    }
  });

  it("lists every section for the sitemap, with change date and photo", async () => {
    const entries = await (await port()).listSitemapEntries();
    const { lastModified } = NAVIGATION_SCENARIO;
    expect(byPath(entries)).toEqual(
      byPath(
        [ROOT, PIZZA, SPEZIAL, FISCH].map((entry) => ({
          path: entry.path!,
          lastModified: lastModified[entry.id] ?? null,
          image: entry.media?.url ?? null,
        })),
      ),
    );
  });

  it("knows every current and former path of the sections", async () => {
    const known = await (await port()).listKnownPaths();
    expect(known).not.toBeNull();
    expect([...known!.current].sort()).toEqual(
      expect.arrayContaining(
        [ROOT, PIZZA, SPEZIAL, FISCH].map((entry) => entry.path!).sort(),
      ),
    );
    expect(known!.former).toEqual(
      expect.arrayContaining(["/Speisekarte/Fisch/"]),
    );
    for (const prefix of known!.unlistedPrefixes) {
      expect(prefix).toMatch(/^\/.+\/$/);
    }
  });
});
