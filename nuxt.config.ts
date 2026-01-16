// https://v3.nuxtjs.org/api/configuration/nuxt.config
const sw = process.env.SW === "true";

export default defineNuxtConfig({
  app: {
    head: {
      title: "ShopBite – Kostenloses Online-Bestellsystem für Gastronomie",
      htmlAttrs: {
        lang: "de",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Dein eigenes Bestellsystem ohne Provisionen, ohne monatliche Kosten – 100% Open Source und individuell anpassbar. Perfekt für Pizzerien, Imbisse und Lieferdienste.",
        },
        {
          property: "og:title",
          content:
            "Dein eigenes Bestellsystem ohne Provisionen, ohne monatliche Kosten – 100% Open Source und individuell anpassbar. Perfekt für Pizzerien, Imbisse und Lieferdienste.",
        },
        {
          property: "og:description",
          content: "Italienisch-deutsche Küche in Obertshausen",
        },
      ],
      link: [{ rel: "icon", href: "/favicon.ico", type: "image/png" }],
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
    shopware: {
      adminClientId: "",
      adminClientSecret: "",
      adminEndpoint: "",
    },
    apiClientConfig: {},
    geoapifyApiKey: "",
    public: {
      shopBite: {
        feature: {
          multiChannel: "",
        },
      },
      site: {
        name: "ShopBite",
        description: "Reduziere deine Kosten und steigere deinen Umsatz",
        countryId: "",
      },
      storeUrl: "",
      sentry: {
        dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
      },
    },
  },

  routeRules: {
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
    "@nuxt/scripts",
    "@nuxtjs/plausible",
    "nuxt-vitalizer",
  ],

  plausible: {
    ignoredHostnames: ["localhost"],
  },

  content: {
    experimental: { sqliteConnector: "native" },
  },

  vitalizer: {
    disablePrefetchLinks: true,
  },

  pwa: {
    strategies: sw ? "injectManifest" : "generateSW",
    srcDir: sw ? "service-worker" : undefined,
    filename: sw ? "sw.ts" : undefined,
    registerType: "autoUpdate",
    manifest: {
      name: "ShopBite",
      short_name: "ShopBite",
      theme_color: "#ff5b00",
      icons: [
        {
          src: "shopbite-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "shopbite-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "shopbite-512.png",
          sizes: "512x512",
          type: "image/svg",
          purpose: "any maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      globIgnores: ["**/_payload.json"],
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      globIgnores: ["**/_payload.json"],
    },
    client: {
      installPrompt: true,
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
    payloadExtraction: true,
    watcher: "parcel",
  },
  $development: {
    modules: [
      "@shopware/nuxt-module",
      "@nuxt/image",
      "@nuxt/content",
      "@nuxtjs/robots",
      "@vite-pwa/nuxt",
      "@sentry/nuxt/module",
      "@nuxt/ui",
      "@nuxt/scripts",
      "@nuxtjs/plausible",
      "@nuxt/test-utils/module",
      "@nuxt/eslint",
    ],
  },
  $production: {
    scripts: {
      registry: {
        matomoAnalytics: {
          matomoUrl: "",
          siteId: "",
        },
      },
    },
  },
});
