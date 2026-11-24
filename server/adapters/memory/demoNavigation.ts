import type { NavigationNode } from "../../../shared/domain";
import type { MemoryCatalog } from "./catalog";
import { id } from "./demoMenu";
import {
  pathOf,
  resolveShopLocale,
  type PageName,
  type ShopLocale,
} from "../../../i18n/shopLocale";
import { demoLocale, type DemoLocale } from "./demoLocale";
import { toNode, type MemoryNavigation } from "./navigation";

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
  label: string = name,
): NavigationNode => ({
  id: id(`category:footer:${name}`),
  label,
  kind: "group",
  path: null,
  external: false,
  icon: null,
  media: null,
  children,
});

/**
 * The quickstart's header and footer (its `setup.py`): the menu root with
 * its sections and a contact link in the header; the footer columns
 * "Beliebt" (the first four sections), "Service" and "Rechtliches".
 */
export function demoNavigation(
  catalog: MemoryCatalog,
  words: DemoLocale = demoLocale("de"),
  locale: Pick<ShopLocale, "pagePaths" | "contentPaths"> = resolveShopLocale(
    {},
    {},
  ),
): MemoryNavigation {
  const sections = catalog.sections;
  const nav = words.navigation;
  const page = (name: PageName) => pathOf(locale.pagePaths, name);
  const content = locale.contentPaths;
  const footerLink = (
    column: string,
    key: string,
    path: string,
    label: string = key,
  ) => link(`category:footer:${column}:${key}`, label, path);
  return {
    main: [
      ...(catalog.menuRoot
        ? [toNode({ ...catalog.menuRoot, children: sections })]
        : []),
      link("category:kontakt", nav.contact, page("kontakt")),
    ],
    footer: [
      // ids by the German names, the same in every language
      group(
        "Beliebt",
        sections
          .slice(0, 4)
          .map((section) =>
            footerLink("Beliebt", section.name, section.path ?? ""),
          ),
        nav.popular,
      ),
      group(
        "Service",
        [
          footerLink("Service", "Kontakt", page("kontakt"), nav.contact),
          footerLink(
            "Service",
            "Zahlung und Versand",
            content.shipping,
            nav.shipping,
          ),
          footerLink("Service", "Mein Konto", page("konto"), nav.account),
          footerLink("Service", "Merkliste", page("merkliste"), nav.wishlist),
        ],
        nav.service,
      ),
      group(
        "Rechtliches",
        [
          footerLink("Rechtliches", "Impressum", content.imprint, nav.imprint),
          footerLink(
            "Rechtliches",
            "Datenschutz",
            content.privacy,
            nav.privacy,
          ),
          footerLink("Rechtliches", "AGB", content.terms, nav.terms),
        ],
        nav.legal,
      ),
    ],
    formerPaths: {},
    lastModified: {},
  };
}
