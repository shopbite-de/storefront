import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import {
  FILE_PAGE_PATHS,
  languageOf,
  localizedDefault,
  localizePages,
  SITE_TEXTS,
  pathOf,
  resolveShopLocale,
  shopRouteRules,
  type PageNode,
} from "../../i18n/shopLocale";

/** The app's pages as Nuxt's file router names them (pages/). */
const pages = (): PageNode[] => [
  { name: "index", path: "/" },
  { name: "all", path: "/:all(.*)*" },
  { name: "anmelden", path: "/anmelden" },
  {
    name: "bestellung",
    path: "/bestellung",
    children: [
      { name: "bestellung-id-erfolg", path: ":id()/erfolg" },
      { name: "bestellung-id-fehler", path: ":id()/fehler" },
      { name: "bestellung-id", path: ":id()" },
      { name: "bestellung-kasse", path: "kasse" },
    ],
  },
  { name: "konto", path: "/konto" },
  { name: "konto-bestellung-id", path: "/konto/bestellung/:id()" },
  { name: "account-recover-password", path: "/account/recover/password" },
  { name: "merkliste", path: "/merkliste" },
];

const paths = (nodes: PageNode[], prefix = ""): Record<string, string> =>
  Object.fromEntries(
    nodes.flatMap((node) => {
      const path = node.path.startsWith("/")
        ? node.path
        : `${prefix}/${node.path}`;
      return [
        [node.name, path],
        ...Object.entries(paths(node.children ?? [], path)),
      ];
    }),
  );

describe("resolveShopLocale", () => {
  it("is German by default", () => {
    const locale = resolveShopLocale({}, {});
    expect(locale.code).toBe("de");
    expect(locale.pagePaths).toEqual(FILE_PAGE_PATHS);
    expect(locale.contentPaths.terms).toBe("/agb");
    expect(locale.menuPath).toBe("/speisekarte/");
  });

  it("takes the build environment before the option", () => {
    expect(
      resolveShopLocale({ locale: "de" }, { NUXT_SHOPBITE_LOCALE: "en" }).code,
    ).toBe("en");
  });

  it("gives English its own paths", () => {
    const locale = resolveShopLocale({ locale: "en" }, {});
    expect(locale.pagePaths["bestellung-kasse"]).toBe("/order/checkout");
    expect(locale.contentPaths.privacy).toBe("/privacy");
    expect(locale.menuPath).toBe("/menu/");
  });

  it("lets a shop override single paths", () => {
    const locale = resolveShopLocale(
      { locale: "en", paths: { merkliste: "/saved", terms: "/tos" } },
      {},
    );
    expect(locale.pagePaths.merkliste).toBe("/saved");
    expect(locale.pagePaths.konto).toBe("/account");
    expect(locale.contentPaths.terms).toBe("/tos");
    expect(
      resolveShopLocale({ locale: "en", paths: { menu: "/food/" } }, {})
        .menuPath,
    ).toBe("/food/");
  });

  it("keeps the German paths for a locale of the shop's own", () => {
    const locale = resolveShopLocale({ locale: "fr" }, {});
    expect(locale.code).toBe("fr");
    expect(locale.pagePaths).toEqual(FILE_PAGE_PATHS);
    expect(locale.contentPaths.terms).toBe("/agb");
  });

  it("refuses a locale code that is not one", () => {
    expect(() => resolveShopLocale({ locale: "de_DE" }, {})).toThrow(
      /shopBite.locale/,
    );
  });

  it("refuses a path that does not start with a slash", () => {
    expect(() =>
      resolveShopLocale({ locale: "en", paths: { konto: "account" } }, {}),
    ).toThrow(/konto/);
  });
});

describe("languageOf", () => {
  it("is de-DE and en-GB for the storefront's locales", () => {
    expect(languageOf("de")).toBe("de-DE");
    expect(languageOf("en")).toBe("en-GB");
  });

  it("takes the shop's tag for a locale of its own, else the code", () => {
    expect(languageOf("nl", "nl-nl")).toBe("nl-NL");
    expect(languageOf("nl")).toBe("nl");
  });

  it("refuses a tag Intl does not know", () => {
    expect(() => languageOf("nl", "not a tag")).toThrow(/no language tag/);
  });
});

describe("FILE_PAGE_PATHS", () => {
  it("name every page at its file's path", () => {
    const file = (path: string) =>
      `app/pages${path.replace(/:(\w+)\(\)/g, "[$1]")}`;
    const missing = Object.entries(FILE_PAGE_PATHS).filter(
      ([, path]) =>
        !existsSync(`${file(path)}.vue`) &&
        !existsSync(`${file(path === "/" ? "" : path)}/index.vue`),
    );
    expect(missing).toEqual([]);
  });
});

describe("pathOf", () => {
  it("fills in and encodes the parameters", () => {
    const { pagePaths } = resolveShopLocale({ locale: "en" }, {});
    expect(pathOf(pagePaths, "bestellung-id-erfolg", { id: "a/b" })).toBe(
      "/order/a%2Fb/success",
    );
    expect(pathOf(FILE_PAGE_PATHS, "bestellung-id-fehler", { id: "7" })).toBe(
      "/bestellung/7/fehler",
    );
  });

  it("refuses a missing parameter", () => {
    expect(() => pathOf(FILE_PAGE_PATHS, "bestellung-id")).toThrow(/id/);
  });
});

describe("localizePages", () => {
  it("leaves every German path as the file router made it", () => {
    const tree = pages();
    localizePages(tree, resolveShopLocale({}, {}).pagePaths);
    expect(tree).toEqual(pages());
  });

  it("moves pages and their children to the English paths, names kept", () => {
    const tree = pages();
    localizePages(tree, resolveShopLocale({ locale: "en" }, {}).pagePaths);
    expect(paths(tree)).toEqual({
      index: "/",
      all: "/:all(.*)*",
      anmelden: "/login",
      bestellung: "/order",
      "bestellung-id-erfolg": "/order/:id()/success",
      "bestellung-id-fehler": "/order/:id()/payment-failed",
      "bestellung-id": "/order/:id()",
      "bestellung-kasse": "/order/checkout",
      konto: "/account",
      "konto-bestellung-id": "/account/orders/:id()",
      "account-recover-password": "/account/recover/password",
      merkliste: "/favourites",
    });
  });

  it("refuses a child path outside its parent's", () => {
    const tree = pages();
    expect(() =>
      localizePages(tree, { bestellung: "/order", "bestellung-kasse": "/pay" }),
    ).toThrow(/bestellung-kasse/);
  });
});

describe("shopRouteRules", () => {
  it("are the rules of 3.x for German", () => {
    const { routeRules, robotsDisallow } = shopRouteRules(
      resolveShopLocale({}, {}),
    );
    expect(routeRules).toEqual({
      "/merkliste": { ssr: false },
      "/registrierung/bestaetigen": { ssr: false },
      "/bestellung": {
        redirect: { to: "/bestellung/kasse", statusCode: 301 },
      },
      "/bestellung/warenkorb": {
        redirect: { to: "/bestellung/kasse", statusCode: 301 },
      },
      "/bestellung/zahlung-versand": {
        redirect: { to: "/bestellung/kasse", statusCode: 301 },
      },
      "/bestellung/bestaetigen": {
        redirect: { to: "/bestellung/kasse", statusCode: 301 },
      },
    });
    expect(robotsDisallow).toEqual([
      "/merkliste",
      "/passwort-vergessen",
      "/account/recover/password",
    ]);
  });

  it("follow the English paths, without the German step routes", () => {
    const { routeRules, robotsDisallow } = shopRouteRules(
      resolveShopLocale({ locale: "en" }, {}),
    );
    expect(routeRules).toEqual({
      "/favourites": { ssr: false },
      "/register/confirm": { ssr: false },
      "/order": { redirect: { to: "/order/checkout", statusCode: 301 } },
    });
    expect(robotsDisallow).toEqual([
      "/favourites",
      "/forgot-password",
      "/account/recover/password",
    ]);
  });
});

describe("localizedDefault", () => {
  it("replaces the German default of a config text", () => {
    expect(
      localizedDefault(
        "%s | %siteName – Online bestellen",
        "titleTemplate",
        "en",
      ),
    ).toBe("%s | %siteName – Order online");
  });

  it("keeps what the shop set and the German default for German", () => {
    expect(localizedDefault("Pizza in Musterstadt", "description", "en")).toBe(
      "Pizza in Musterstadt",
    );
    expect(
      localizedDefault(SITE_TEXTS.de!.description, "description", "de"),
    ).toBe(SITE_TEXTS.de!.description);
    expect(
      localizedDefault(SITE_TEXTS.de!.description, "description", "fr"),
    ).toBe(SITE_TEXTS.de!.description);
  });
});
