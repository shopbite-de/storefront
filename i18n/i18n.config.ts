import { shopLocale } from "#shopbite-locale";

// vue-i18n options. A locale the shop adds falls back to English for
// messages it does not translate (yet); German and English are complete
// (test/unit/localeMessages.spec.ts).
export default defineI18nConfig(() => ({
  fallbackLocale: shopLocale.fallbackLocale ?? false,
  fallbackWarn: false,
}));
