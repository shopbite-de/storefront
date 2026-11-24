/**
 * The shop's locale (ADR 0002): one language per shop, chosen at build time
 * with `shopBite.locale` (or `NUXT_SHOPBITE_LOCALE`). It decides the
 * messages (`i18n/locales/<code>.json`), the formatting of dates, times
 * and prices, the content folder and the paths of the app's own pages.
 *
 * Pure: used by modules/locale.ts at build time and by the unit tests.
 */

/** Route names (Nuxt's file router, `pages/`) and content pages → path. */
export type PathTable = Readonly<Record<string, string>>;

/**
 * The content pages the app links to itself (checkout, registration). A
 * shop's own pages need no entry: the catch-all page serves every file of
 * its content folder at the file's path.
 */
export type ContentPage = "imprint" | "privacy" | "terms" | "shipping";

export interface ShopLocaleOptions {
  /** Locale code of the shop: `de` (default), `en` or one the shop adds. */
  locale?: string;
  /**
   * Paths the shop sets itself, by route name (`konto-profil`) or content
   * page (`terms`), e.g. for a locale of its own.
   */
  paths?: Record<string, string>;
}

export interface ShopLocale {
  code: string;
  /** Pages whose path differs from the file router's (German) one. */
  pagePaths: PathTable;
  contentPaths: Readonly<Record<ContentPage, string>>;
}

/** The pages' files are the German paths; English moves them. */
const PAGE_PATHS: Readonly<Record<string, PathTable>> = {
  de: {},
  en: {
    anmelden: "/login",
    bestellung: "/order",
    "bestellung-kasse": "/order/checkout",
    "bestellung-id": "/order/:id()",
    "bestellung-id-erfolg": "/order/:id()/success",
    "bestellung-id-fehler": "/order/:id()/payment-failed",
    kontakt: "/contact",
    konto: "/account",
    "konto-adressen": "/account/addresses",
    "konto-bestellungen": "/account/orders",
    "konto-bestellung-id": "/account/orders/:id()",
    "konto-profil": "/account/profile",
    merkliste: "/wishlist",
    "passwort-vergessen": "/forgot-password",
    registrierung: "/register",
    "registrierung-bestaetigen": "/register/confirm",
    suche: "/search",
    // the link of Shopware's password mail, the same in every language
    // ("account-recover-password": "/account/recover/password")
  },
};

/** The content files of the storefront's own content folder per locale. */
const CONTENT_PATHS: Readonly<Record<string, Record<ContentPage, string>>> = {
  de: {
    imprint: "/impressum",
    privacy: "/datenschutz",
    terms: "/agb",
    shipping: "/zahlung-und-versand",
  },
  en: {
    imprint: "/imprint",
    privacy: "/privacy",
    terms: "/terms",
    shipping: "/delivery-and-payment",
  },
};

const CONTENT_PAGES = Object.keys(CONTENT_PATHS.de!) as ContentPage[];

/** The old step routes of the checkout (before #443), at the German paths. */
const LEGACY_CHECKOUT_PATHS = [
  "/bestellung/warenkorb",
  "/bestellung/zahlung-versand",
  "/bestellung/bestaetigen",
];

const LOCALE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export function resolveShopLocale(
  options: ShopLocaleOptions,
  env: Readonly<Record<string, string | undefined>>,
): ShopLocale {
  const code = env.NUXT_SHOPBITE_LOCALE || options.locale || "de";
  if (!LOCALE_CODE.test(code)) {
    throw new Error(
      `[shopbite:locale] "${code}" is no locale code (shopBite.locale / NUXT_SHOPBITE_LOCALE), e.g. "de" or "en".`,
    );
  }
  // a locale of the shop's own keeps the German paths unless it sets them
  const pagePaths: Record<string, string> = { ...(PAGE_PATHS[code] ?? {}) };
  const contentPaths = { ...(CONTENT_PATHS[code] ?? CONTENT_PATHS.de!) };
  for (const [key, path] of Object.entries(options.paths ?? {})) {
    if (!path.startsWith("/")) {
      throw new Error(
        `[shopbite:locale] shopBite.paths.${key} must start with "/": "${path}".`,
      );
    }
    if ((CONTENT_PAGES as string[]).includes(key)) {
      contentPaths[key as ContentPage] = path;
    } else {
      pagePaths[key] = path;
    }
  }
  return { code, pagePaths, contentPaths };
}

/** A page of Nuxt's `pages:extend` hook, as far as the paths go. */
export interface PageNode {
  name?: string;
  path: string;
  children?: PageNode[];
}

const absolute = (path: string, parent: string) =>
  path.startsWith("/") ? path : `${parent.replace(/\/$/, "")}/${path}`;

/**
 * Moves pages to the locale's paths (`pages:extend`), in place. Route names
 * stay, so links by name (`{ name: "konto-profil" }`) follow the locale. A
 * child keeps a path relative to its parent's.
 */
export function localizePages(
  pages: PageNode[],
  table: PathTable,
  parentPath = "",
): void {
  for (const page of pages) {
    const path = absolute(page.path, parentPath);
    const target = (page.name && table[page.name]) || path;
    if (page.path.startsWith("/") || !parentPath) {
      page.path = target;
    } else {
      const prefix = `${parentPath.replace(/\/$/, "")}/`;
      if (!target.startsWith(prefix)) {
        throw new Error(
          `[shopbite:locale] The path of "${page.name}" (${target}) must lie below its parent's (${parentPath}).`,
        );
      }
      page.path = target.slice(prefix.length);
    }
    if (page.children?.length) localizePages(page.children, table, target);
  }
}

/** The path of a page by route name in a locale (file path if unmoved). */
export function pagePath(locale: ShopLocale, name: string, filePath: string) {
  return locale.pagePaths[name] ?? filePath;
}

/** Route rules and robots.txt entries that name the app's own paths. */
export function shopRouteRules(locale: ShopLocale): {
  routeRules: Record<string, Record<string, unknown>>;
  robotsDisallow: string[];
} {
  const path = (name: string, filePath: string) =>
    pagePath(locale, name, filePath);
  const checkout = path("bestellung-kasse", "/bestellung/kasse");
  const toCheckout = { redirect: { to: checkout, statusCode: 301 } };
  const routeRules: Record<string, Record<string, unknown>> = {
    // the wishlist is loaded in the browser
    [path("merkliste", "/merkliste")]: { ssr: false },
    [path("registrierung-bestaetigen", "/registrierung/bestaetigen")]: {
      ssr: false,
    },
    // One-page checkout (#443): the old step routes lead there.
    [path("bestellung", "/bestellung")]: toCheckout,
  };
  if (checkout === "/bestellung/kasse") {
    for (const legacy of LEGACY_CHECKOUT_PATHS) routeRules[legacy] = toCheckout;
  }
  return {
    routeRules,
    robotsDisallow: [
      path("merkliste", "/merkliste"),
      path("passwort-vergessen", "/passwort-vergessen"),
      path("account-recover-password", "/account/recover/password"),
    ],
  };
}
