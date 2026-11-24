import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addTemplate, addTypeTemplate, defineNuxtModule } from "nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import type { ShopBiteThemeOptions } from "./theme";
import {
  localizePages,
  resolveShopLocale,
  shopRouteRules,
  type ShopLocale,
  type ShopLocaleOptions,
} from "../i18n/shopLocale";

/** The locales the storefront ships messages for. */
export const BUILT_IN = ["de", "en"];

const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface LocaleEntry {
  code: string;
  language?: string;
}

interface LayerI18n {
  locales?: (string | LocaleEntry)[];
  bundle?: { onlyLocales?: string | string[] };
}

/** Every locale the layers register (`i18n.locales`), by code. */
function registeredLocales(nuxt: Nuxt): Map<string, LocaleEntry> {
  const locales = new Map<string, LocaleEntry>();
  for (const layer of [...nuxt.options._layers].reverse()) {
    const i18n = layer.config.i18n as LayerI18n | undefined;
    for (const entry of i18n?.locales ?? []) {
      const locale = typeof entry === "string" ? { code: entry } : entry;
      locales.set(locale.code, { ...locales.get(locale.code), ...locale });
    }
  }
  return locales;
}

/** What the app and the server read: `#shopbite-locale`. */
function localeModule(locale: ShopLocale, language: string) {
  return `export const shopLocale = ${JSON.stringify(
    {
      code: locale.code,
      language,
      pagePaths: locale.pagePaths,
      contentPaths: locale.contentPaths,
      fallbackLocale: BUILT_IN.includes(locale.code) ? null : "en",
    },
    null,
    2,
  )};\n`;
}

const LOCALE_TYPES = `declare module "#shopbite-locale" {
  export const shopLocale: {
    /** The shop's locale code (shopBite.locale), e.g. "de". */
    code: string;
    /** Its BCP 47 language tag for Intl, e.g. "de-DE". */
    language: string;
    /** Pages whose path differs from the file router's, by route name. */
    pagePaths: Readonly<Record<string, string>>;
    /** English for a locale the shop adds, else none. */
    fallbackLocale: string | null;
    /** The content pages the app links to. */
    contentPaths: Readonly<
      Record<"imprint" | "privacy" | "terms" | "shipping", string>
    >;
  };
}
export {};
`;

/**
 * The shop's locale (ADR 0002): one language per shop, chosen at build time
 * by `shopBite.locale` in the shop's nuxt.config.ts (`NUXT_SHOPBITE_LOCALE`
 * takes precedence), German by default. Listed before @nuxtjs/i18n,
 * @nuxtjs/robots and @nuxt/content, whose options it sets:
 *
 * - i18n: the default locale, and only that locale in the bundle (plus
 *   English as the fallback of a locale the shop adds itself);
 * - pages: the app's own paths per locale (`pages:extend`), route names
 *   stay; German keeps the file router's paths;
 * - route rules and robots.txt entries at those paths;
 * - `#shopbite-locale` for the app and the server (language tag, paths);
 * - `NUXT_SHOPBITE_LOCALE` in the build's environment, which
 *   content.config.ts reads for the content folder.
 */
// Both modules read `shopBite`; Nuxt types the key by the module it
// meets last, so this one names the options of both.
export default defineNuxtModule<ShopLocaleOptions & ShopBiteThemeOptions>({
  meta: { name: "shopbite-locale", configKey: "shopBite" },
  setup(options, nuxt) {
    const locale = resolveShopLocale(options, process.env);
    const registered = registeredLocales(nuxt);
    const entry = registered.get(locale.code);
    if (!entry) {
      throw new Error(
        `[shopbite:locale] shopBite.locale "${locale.code}" has no messages. Available: ${[...registered.keys()].join(", ")}. A shop adds a locale in its nuxt.config.ts (i18n.locales: [{ code: "${locale.code}", language: "…", file: "${locale.code}.json" }]) with i18n/locales/${locale.code}.json.`,
      );
    }
    const language = entry.language || locale.code;
    process.env.NUXT_SHOPBITE_LOCALE = locale.code;

    const i18n = (nuxt.options as unknown as { i18n: Record<string, unknown> })
      .i18n;
    i18n.defaultLocale = locale.code;
    // @nuxtjs/i18n reads `bundle.onlyLocales` from the layers' own configs
    const builtIn = BUILT_IN.includes(locale.code);
    const own = nuxt.options._layers.find(
      (layer) => resolve(layer.config.rootDir) === storefrontRoot,
    );
    if (own) {
      const config = own.config as { i18n?: LayerI18n };
      config.i18n = { ...config.i18n, bundle: { ...config.i18n?.bundle } };
      // English is the fallback of a locale the shop adds (i18n.config.ts)
      config.i18n.bundle!.onlyLocales = builtIn
        ? [locale.code]
        : [locale.code, "en"];
    }

    nuxt.hook("pages:extend", (pages) => {
      localizePages(pages, locale.pagePaths);
    });

    const { routeRules, robotsDisallow } = shopRouteRules(locale);
    // the shop's own rules for a path win
    nuxt.options.routeRules = {
      ...routeRules,
      ...nuxt.options.routeRules,
    };
    const robots = ((nuxt.options as unknown as { robots?: unknown }).robots ??
      {}) as { disallow?: string[] };
    robots.disallow = [
      ...new Set([...(robots.disallow ?? []), ...robotsDisallow]),
    ];
    (nuxt.options as unknown as { robots: unknown }).robots = robots;

    const template = addTemplate({
      filename: "shopbite-locale.mjs",
      getContents: () => localeModule(locale, language),
      write: true,
    });
    nuxt.options.alias["#shopbite-locale"] = template.dst;
    nuxt.options.nitro.alias ??= {};
    nuxt.options.nitro.alias["#shopbite-locale"] = template.dst;
    addTypeTemplate(
      {
        filename: "types/shopbite-locale.d.ts",
        getContents: () => LOCALE_TYPES,
      },
      { nitro: true, nuxt: true },
    );
  },
});
