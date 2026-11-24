// A minimal shop that extends the storefront like the real shops do (customer
// shops, the quickstart). CI builds it to catch imports that only
// resolve inside the storefront itself, e.g. the `#shared` alias, which in a
// layer points to the shop's shared/ folder (2.0.1).
//
// It also shows the locale model (ADR 0002): it overrides one German
// message (i18n/locales/de.json, merged over the storefront's) and adds a
// language of its own, Dutch, with a few messages (the rest falls back to
// English) and its own paths for search and wishlist. CI builds it twice: German, and with
// NUXT_SHOPBITE_LOCALE=nl (test/layer/check-locale.sh).
export default defineNuxtConfig({
  extends: ["../.."],
  shopBite: {
    preset: "grill",
    locale: "de",
    // paths of the Dutch build; German keeps the storefront's
    paths:
      process.env.NUXT_SHOPBITE_LOCALE === "nl"
        ? { suche: "/zoeken", merkliste: "/favorieten" }
        : {},
  },
  i18n: {
    locales: [
      { code: "de", file: "de.json" },
      { code: "nl", language: "nl-NL", name: "Nederlands", file: "nl.json" },
    ],
  },
});
