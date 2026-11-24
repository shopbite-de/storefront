import { describe, expect, it } from "vitest";
import {
  localizePages,
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
    expect(locale.pagePaths).toEqual({});
    expect(locale.contentPaths.terms).toBe("/agb");
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
  });

  it("lets a shop override single paths", () => {
    const locale = resolveShopLocale(
      { locale: "en", paths: { merkliste: "/favourites", terms: "/tos" } },
      {},
    );
    expect(locale.pagePaths.merkliste).toBe("/favourites");
    expect(locale.pagePaths.konto).toBe("/account");
    expect(locale.contentPaths.terms).toBe("/tos");
  });

  it("keeps the German paths for a locale of the shop's own", () => {
    const locale = resolveShopLocale({ locale: "fr" }, {});
    expect(locale.code).toBe("fr");
    expect(locale.pagePaths).toEqual({});
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
      merkliste: "/wishlist",
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
      "/wishlist": { ssr: false },
      "/register/confirm": { ssr: false },
      "/order": { redirect: { to: "/order/checkout", statusCode: 301 } },
    });
    expect(robotsDisallow).toEqual([
      "/wishlist",
      "/forgot-password",
      "/account/recover/password",
    ]);
  });
});
