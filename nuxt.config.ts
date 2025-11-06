// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  colorMode: {
    preference: "light",
  },
  robots: {
    disallow: [
      "/merkliste",
      "/passwort-vergessen",
      "/account/recover/password",
    ],
  },

  runtimeConfig: {
    shopware: {},
    apiClientConfig: {},
    public: {
      storeUrl: "",
      sentry: {
        dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
      },
    },
  },

  routeRules: {
    "/": {
      prerender: true,
    },
    "/speisekarte": {
      prerender: true,
    },
    "/merkliste": {
      ssr: false,
    },
    "/registrierung/bestaetigen": {
      ssr: false,
    },
  },

  css: ["~/assets/css/main.css"],

  shopware: {
    endpoint: "",
    accessToken: "",
    devStorefrontUrl: "",
  },

  modules: [
    "@shopware/nuxt-module",
    "@nuxt/image",
    "@nuxt/content",
    "@nuxtjs/robots",
    "@sentry/nuxt/module",
    "@nuxt/ui",
    "@nuxtjs/plausible",
    ...process.env.NODE_ENV === 'development' ? [
      "@nuxt/test-utils/module",
      "@nuxt/eslint"
    ] : [],
  ],

  plausible: {
    ignoredHostnames: ["localhost"],
  },

  nitro: {
    preset: 'bun',
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
  },

  devtools: { enabled: true },
  extends: ["@shopware/composables/nuxt-layer"],
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: "2025-07-15",

  experimental: {
    asyncContext: true,
  },
});
