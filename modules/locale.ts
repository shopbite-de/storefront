import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  addTypeTemplate,
  defineNuxtModule,
  updateTemplates,
} from "nuxt/kit";
import type { Nuxt } from "nuxt/schema";
import type { ShopBiteThemeOptions } from "./theme";
import { availableLocales, messagesModule } from "../i18n/messages";
import {
  languageOf,
  localizedDefault,
  localizePages,
  mergeRouteRules,
  resolveShopLocale,
  shopRouteRules,
  type ShopLocale,
  type ShopLocaleOptions,
} from "../i18n/shopLocale";

/** The locales the storefront ships messages for. */
export const BUILT_IN = ["de", "en"];

const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The message engine without its compiler (the bundler drops it): the
 * messages arrive compiled (`#shopbite-messages`).
 */
const INTLIFY_FLAGS = {
  __INTLIFY_DROP_MESSAGE_COMPILER__: "true",
  __INTLIFY_PROD_DEVTOOLS__: "false",
};

const runtimeFile = (name: string) =>
  resolve(storefrontRoot, "i18n", "runtime", name);

const CONTENT_CONFIGS = [
  "content.config.ts",
  "content.config.mjs",
  "content.config.js",
];

/**
 * The content folder Nuxt Content reads for the locale: the layer whose
 * content.config wins (the shop's own, else the storefront's) has either
 * a folder named after the locale (`content/en/`) or its pages at the top
 * of `content/`. Folders named after the other locales are left out.
 */
export function contentDirs(
  nuxt: Pick<Nuxt, "options">,
  code: string,
  codes: string[],
): { dir: string; exclude: string[] } {
  const layer = nuxt.options._layers.find((candidate) =>
    CONTENT_CONFIGS.some((file) =>
      existsSync(resolve(candidate.config.rootDir, file)),
    ),
  );
  const root = layer?.config.rootDir ?? nuxt.options.rootDir;
  const dir = existsSync(resolve(root, "content", code)) ? code : "";
  return { dir, exclude: dir ? [] : codes.filter((other) => other !== code) };
}

/**
 * The config's German defaults in the locale: the html lang of the
 * document shell (rendered pages set it in app.vue), the description in
 * head and manifest, the title template. Values a shop set stay.
 */
function localizeSiteDefaults(nuxt: Nuxt, code: string) {
  const options = nuxt.options as unknown as {
    app: {
      head: {
        htmlAttrs?: Record<string, string>;
        meta?: { content?: string }[];
      };
    };
    pwa?: { manifest?: { description?: string } };
    runtimeConfig: {
      public: { site?: { description?: string; titleTemplate?: string } };
    };
  };
  options.app.head.htmlAttrs = { ...options.app.head.htmlAttrs, lang: code };
  for (const meta of options.app.head.meta ?? []) {
    if (typeof meta.content === "string") {
      meta.content = localizedDefault(meta.content, "description", code);
    }
  }
  const manifest = options.pwa?.manifest;
  if (manifest?.description) {
    manifest.description = localizedDefault(
      manifest.description,
      "description",
      code,
    );
  }
  const site = options.runtimeConfig.public.site;
  if (site?.description) {
    site.description = localizedDefault(site.description, "description", code);
  }
  if (site?.titleTemplate) {
    site.titleTemplate = localizedDefault(
      site.titleTemplate,
      "titleTemplate",
      code,
    );
  }
}

/** What the app and the server read: `#shopbite-locale`. */
function localeModule(locale: ShopLocale, language: string) {
  return `export const shopLocale = ${JSON.stringify(
    {
      code: locale.code,
      language,
      pagePaths: locale.pagePaths,
      contentPaths: locale.contentPaths,
      menuPath: locale.menuPath,
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
    /** The menu root's path (backend data; shopBite.paths.menu). */
    menuPath: string;
    /** The content pages the app links to. */
    contentPaths: Readonly<
      Record<"imprint" | "privacy" | "terms" | "shipping", string>
    >;
  };
}
export {};
`;

const MESSAGES_TYPES = `declare module "#shopbite-messages" {
  /** The compiled messages (vue-i18n message ASTs) by locale code. */
  export const messages: Record<string, Record<string, unknown>>;
}
export {};
`;

/**
 * The shop's locale (ADR 0002): one language per shop, chosen at build time
 * by `shopBite.locale` in the shop's nuxt.config.ts (`NUXT_SHOPBITE_LOCALE`
 * takes precedence), German by default. Listed before @nuxtjs/robots and
 * @nuxt/content, whose options it sets:
 *
 * - messages: the layers' locale files merged and compiled at build time
 *   into `#shopbite-messages` (only the shop's locale, plus English as the
 *   fallback of a locale the shop adds), evaluated by i18n/runtime in the
 *   app (`$t`, `useI18n()`, `<i18n-t>`) and on the server;
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
    const layerRoots = nuxt.options._layers.map(
      (layer) => layer.config.rootDir,
    );
    const available = availableLocales(layerRoots);
    if (!available.includes(locale.code)) {
      throw new Error(
        `[shopbite:locale] shopBite.locale "${locale.code}" has no messages. Available: ${available.join(", ")}. A shop adds a locale with i18n/locales/${locale.code}.json (and shopBite.language, e.g. "nl-NL").`,
      );
    }
    const language = languageOf(locale.code, options.language);
    // a locale the shop adds falls back to English
    const bundled = BUILT_IN.includes(locale.code)
      ? [locale.code]
      : [locale.code, "en"];
    process.env.NUXT_SHOPBITE_LOCALE = locale.code;
    // content.config.ts: the content folder of the locale
    const content = contentDirs(nuxt, locale.code, available);
    process.env.NUXT_SHOPBITE_CONTENT_DIR = content.dir;
    process.env.NUXT_SHOPBITE_CONTENT_EXCLUDE = content.exclude.join(",");

    localizeSiteDefaults(nuxt, locale.code);

    nuxt.hook("pages:extend", (pages) => {
      localizePages(pages, locale.pagePaths);
    });

    const { routeRules, robotsDisallow } = shopRouteRules(locale);
    // merged per path; the shop's values win
    nuxt.options.routeRules = mergeRouteRules(
      routeRules,
      nuxt.options.routeRules as Record<string, Record<string, unknown>>,
    );
    const robots = ((nuxt.options as unknown as { robots?: unknown }).robots ??
      {}) as { disallow?: string[] };
    robots.disallow = [
      ...new Set([...(robots.disallow ?? []), ...robotsDisallow]),
    ];
    (nuxt.options as unknown as { robots: unknown }).robots = robots;

    nuxt.options.nitro.alias ??= {};
    const template = addTemplate({
      filename: "shopbite-locale.mjs",
      getContents: () => localeModule(locale, language),
      write: true,
    });
    nuxt.options.alias["#shopbite-locale"] = template.dst;
    nuxt.options.nitro.alias["#shopbite-locale"] = template.dst;
    addTypeTemplate(
      {
        filename: "types/shopbite-locale.d.ts",
        getContents: () => LOCALE_TYPES,
      },
      { nitro: true, nuxt: true },
    );

    // The messages, compiled at build time and bundled (ADR 0002)
    const messages = addTemplate({
      filename: "shopbite-messages.mjs",
      getContents: () => messagesModule(layerRoots, bundled),
      write: true,
    });
    nuxt.options.alias["#shopbite-messages"] = messages.dst;
    nuxt.options.nitro.alias["#shopbite-messages"] = messages.dst;
    addTypeTemplate(
      {
        filename: "types/shopbite-messages.d.ts",
        getContents: () => MESSAGES_TYPES,
      },
      { nitro: true, nuxt: true },
    );
    nuxt.hook("builder:watch", async (_event, path) => {
      if (/(^|\/)i18n\/locales\//.test(path)) {
        await updateTemplates({
          filter: (template) => template.filename === messages.filename,
        });
      }
    });

    nuxt.options.vite.define = {
      ...nuxt.options.vite.define,
      ...INTLIFY_FLAGS,
    };
    nuxt.options.nitro.replace = {
      ...nuxt.options.nitro.replace,
      ...INTLIFY_FLAGS,
    };
    addImports({ name: "useI18n", from: runtimeFile("shop") });
    addComponent({ name: "I18nT", filePath: runtimeFile("I18nT") });
    addPlugin({ src: runtimeFile("plugin"), name: "shopbite:i18n" });
    addTypeTemplate(
      {
        filename: "types/shopbite-i18n.d.ts",
        getContents:
          () => `import type { ShopTranslate } from ${JSON.stringify(runtimeFile("translator"))};
declare module "vue" {
  interface ComponentCustomProperties {
    /** The shop's messages (ADR 0002, i18n/runtime). */
    $t: ShopTranslate;
  }
}
export {};
`,
      },
      { nuxt: true },
    );
  },
});
