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
  /**
   * BCP 47 language tag for formatting (Intl), e.g. `nl-NL` for a locale
   * the shop adds; German and English have theirs (`LANGUAGES`).
   */
  language?: string;
}

export interface ShopLocale {
  code: string;
  /** Every page's path in the locale, by route name. */
  pagePaths: PathTable;
  contentPaths: Readonly<Record<ContentPage, string>>;
  /**
   * The menu root's path, which the backend gives it (the quickstart's
   * Shopware: `/speisekarte/`); the app links to it from pages without a
   * navigation (empty cart, error page). `shopBite.paths.menu` sets it.
   */
  menuPath: string;
}

/**
 * The app's pages by route name at their files' paths, which are the
 * German ones (test/unit/shopLocale.spec.ts checks them against pages/).
 */
export const FILE_PAGE_PATHS = {
  index: "/",
  anmelden: "/anmelden",
  bestellung: "/bestellung",
  "bestellung-kasse": "/bestellung/kasse",
  "bestellung-id": "/bestellung/:id()",
  "bestellung-id-erfolg": "/bestellung/:id()/erfolg",
  "bestellung-id-fehler": "/bestellung/:id()/fehler",
  kontakt: "/kontakt",
  konto: "/konto",
  "konto-adressen": "/konto/adressen",
  "konto-bestellungen": "/konto/bestellungen",
  "konto-bestellung-id": "/konto/bestellung/:id()",
  "konto-profil": "/konto/profil",
  maintenance: "/maintenance",
  merkliste: "/merkliste",
  "passwort-vergessen": "/passwort-vergessen",
  "account-recover-password": "/account/recover/password",
  registrierung: "/registrierung",
  "registrierung-bestaetigen": "/registrierung/bestaetigen",
  suche: "/suche",
} as const satisfies PathTable;

export type PageName = keyof typeof FILE_PAGE_PATHS;

/** Pages a locale moves away from their German paths. */
const MOVED_PAGES: Readonly<Record<string, Partial<Record<PageName, string>>>> =
  {
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
      merkliste: "/favourites",
      "passwort-vergessen": "/forgot-password",
      registrierung: "/register",
      "registrierung-bestaetigen": "/register/confirm",
      suche: "/search",
      // /account/recover/password is the link of Shopware's password
      // mail, the same in every language; /maintenance stays too
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

/** The menu root's path per locale (backend data, see ShopLocale). */
const MENU_PATHS: Readonly<Record<string, string>> = {
  de: "/speisekarte/",
  en: "/menu/",
};

const CONTENT_PAGES = Object.keys(CONTENT_PATHS.de!) as ContentPage[];

/** The old step routes of the checkout (before #443), at the German paths. */
const LEGACY_CHECKOUT_PATHS = [
  "/bestellung/warenkorb",
  "/bestellung/zahlung-versand",
  "/bestellung/bestaetigen",
];

/** The language tags of the storefront's locales. */
export const LANGUAGES: Readonly<Record<string, string>> = {
  de: "de-DE",
  en: "en-GB",
};

/** The language tag of a locale: the shop's, else the storefront's, else the code. */
export function languageOf(code: string, language?: string): string {
  const tag = language || LANGUAGES[code] || code;
  try {
    return Intl.getCanonicalLocales(tag)[0]!;
  } catch {
    throw new Error(
      `[shopbite:locale] shopBite.language "${tag}" is no language tag, e.g. "nl-NL".`,
    );
  }
}

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
  const pagePaths: Record<string, string> = {
    ...FILE_PAGE_PATHS,
    ...MOVED_PAGES[code],
  };
  const contentPaths = { ...(CONTENT_PATHS[code] ?? CONTENT_PATHS.de!) };
  let menuPath = MENU_PATHS[code] ?? MENU_PATHS.de!;
  for (const [key, path] of Object.entries(options.paths ?? {})) {
    if (!path.startsWith("/")) {
      throw new Error(
        `[shopbite:locale] shopBite.paths.${key} must start with "/": "${path}".`,
      );
    }
    if (key === "menu") {
      menuPath = path;
    } else if ((CONTENT_PAGES as string[]).includes(key)) {
      contentPaths[key as ContentPage] = path;
    } else {
      pagePaths[key] = path;
    }
  }
  return { code, pagePaths, contentPaths, menuPath };
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

/**
 * The path of a page in a locale with its parameters filled in, e.g.
 * `pathOf(locale, "bestellung-id-erfolg", { id })`.
 */
export function pathOf(
  table: PathTable,
  name: PageName,
  params: Readonly<Record<string, string>> = {},
): string {
  const path = table[name] ?? FILE_PAGE_PATHS[name];
  return path.replace(/:(\w+)\(\)/g, (_, param: string) => {
    const value = params[param];
    if (value === undefined) {
      throw new Error(
        `[shopbite:locale] ${name} needs the parameter ${param}.`,
      );
    }
    return encodeURIComponent(value);
  });
}

/** Route rules and robots.txt entries that name the app's own paths. */
export function shopRouteRules(locale: ShopLocale): {
  routeRules: Record<string, Record<string, unknown>>;
  robotsDisallow: string[];
} {
  const path = (name: PageName) =>
    locale.pagePaths[name] ?? FILE_PAGE_PATHS[name];
  const checkout = path("bestellung-kasse");
  const toCheckout = { redirect: { to: checkout, statusCode: 301 } };
  const routeRules: Record<string, Record<string, unknown>> = {
    // the wishlist is loaded in the browser
    [path("merkliste")]: { ssr: false },
    [path("registrierung-bestaetigen")]: {
      ssr: false,
    },
    // One-page checkout (#443): the old step routes lead there.
    [path("bestellung")]: toCheckout,
  };
  if (checkout === "/bestellung/kasse") {
    for (const legacy of LEGACY_CHECKOUT_PATHS) routeRules[legacy] = toCheckout;
  }
  return {
    routeRules,
    robotsDisallow: [
      path("merkliste"),
      path("passwort-vergessen"),
      path("account-recover-password"),
    ],
  };
}

/**
 * Texts of nuxt.config.ts defaults that a shop usually sets itself (its
 * description, the title template of `runtimeConfig.public.site`), per
 * locale. The config holds the German ones; modules/locale.ts replaces a
 * value that is still the German default.
 */
export const SITE_TEXTS: Readonly<
  Record<string, { description: string; titleTemplate: string }>
> = {
  de: {
    description: "Reduziere deine Kosten und steigere deinen Umsatz",
    titleTemplate: "%s | %siteName – Online bestellen",
  },
  en: {
    description: "Cut your costs and grow your sales",
    titleTemplate: "%s | %siteName – Order online",
  },
};

/** A config value in the locale: the German default replaced, else kept. */
export function localizedDefault(
  value: string,
  key: "description" | "titleTemplate",
  code: string,
): string {
  const texts = SITE_TEXTS[code];
  return texts && value === SITE_TEXTS.de![key] ? texts[key] : value;
}
