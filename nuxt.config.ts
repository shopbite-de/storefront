// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  app: {
    head: {
      title: "Pizzeria La Fattoria - Alte Schmiede",
      htmlAttrs: {
        lang: "de",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Italienisch-deutsche Küche in Obertshausen",
        },
        {
          property: "og:title",
          content: "Pizzeria La Fattoria - Alte Schmiede",
        },
        {
          property: "og:description",
          content: "Italienisch-deutsche Küche in Obertshausen",
        },
      ],
      link: [{ rel: "icon", href: "/favicon.ico" }],
    },
  },
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
      site: {
        name: "Pizzeria La Fattoria",
        description: "Italienisch-deutsche Küche in Obertshausen",
      },
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
    "@vite-pwa/nuxt",
    "@sentry/nuxt/module",
    "@nuxt/ui",
    "@nuxtjs/plausible",
    ...(process.env.NODE_ENV === "development"
      ? ["@nuxt/test-utils/module", "@nuxt/eslint"]
      : []),
  ],

  plausible: {
    ignoredHostnames: ["localhost"],
  },

  content: {
    experimental: { sqliteConnector: "native" },
  },

  pwa: {
    manifest: {
      name: "ShopBite",
      short_name: "ShopBite",
      theme_color: "#4d7c0f",
      icons: [
        {
          src: "dark/Logo.svg",
          sizes: "192x192",
          type: "image/svg",
        },
        {
          src: "dark/Logo.svg",
          sizes: "512x512",
          type: "image/svg",
        },
        {
          src: "dark/Logo.svg",
          sizes: "512x512",
          type: "image/svg",
          purpose: "any maskable",
        },
      ],
    },
  },

  nitro: {
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
