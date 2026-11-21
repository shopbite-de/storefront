import type { MenuSection, NavigationNode } from "../../../shared/domain";
import type { MemoryCatalog } from "./catalog";
import { id } from "./demoMenu";
import type { MemoryNavigation } from "./navigation";

const link = (key: string, label: string, path: string): NavigationNode => ({
  id: id(key),
  label,
  kind: "link",
  path,
  external: false,
  icon: null,
  media: null,
  children: [],
});

const group = (
  name: string,
  children: readonly NavigationNode[],
): NavigationNode => ({
  id: id(`category:footer:${name}`),
  label: name,
  kind: "group",
  path: null,
  external: false,
  icon: null,
  media: null,
  children,
});

const sectionNode = (section: Omit<MenuSection, "children">) => ({
  id: section.id,
  label: section.name,
  kind: "menu-section" as const,
  path: section.path,
  external: false,
  icon: section.icon,
  media: null,
});

/**
 * The quickstart's header and footer (its `setup.py`): the menu root with
 * its sections and a contact link in the header; the footer columns
 * "Beliebt" (the first four sections), "Service" and "Rechtliches".
 */
export function demoNavigation(catalog: MemoryCatalog): MemoryNavigation {
  const sections = catalog.sections;
  const footerLink = (column: string, label: string, path: string) =>
    link(`category:footer:${column}:${label}`, label, path);
  return {
    main: [
      ...(catalog.menuRoot
        ? [
            {
              ...sectionNode(catalog.menuRoot),
              children: sections.map((section) => ({
                ...sectionNode(section),
                children: [],
              })),
            },
          ]
        : []),
      link("category:kontakt", "Kontakt", "/kontakt"),
    ],
    footer: [
      group(
        "Beliebt",
        sections
          .slice(0, 4)
          .map((section) =>
            footerLink("Beliebt", section.name, section.path ?? ""),
          ),
      ),
      group("Service", [
        footerLink("Service", "Kontakt", "/kontakt"),
        footerLink("Service", "Zahlung und Versand", "/zahlung-und-versand"),
        footerLink("Service", "Mein Konto", "/konto"),
        footerLink("Service", "Merkliste", "/merkliste"),
      ]),
      group("Rechtliches", [
        footerLink("Rechtliches", "Impressum", "/impressum"),
        footerLink("Rechtliches", "Datenschutz", "/datenschutz"),
        footerLink("Rechtliches", "AGB", "/agb"),
      ]),
    ],
    formerPaths: {},
    lastModified: {},
  };
}
