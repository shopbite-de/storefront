import { resolveShopLocale } from "../../i18n/shopLocale";

/**
 * `#shopbite-locale` of the Node test project: a German shop, as
 * modules/locale.ts writes it for the default build.
 */
export const shopLocale = {
  ...resolveShopLocale({}, {}),
  language: "de-DE",
  fallbackLocale: null,
};
