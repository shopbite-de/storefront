// https://v3.nuxtjs.org/api/configuration/nuxt.config
const storeName = process.env.NUXT_STORE_NAME || "ShopBite";
const storeDescription =
  process.env.NUXT_STORE_DESCRIPTION ||
  "Reduziere deine Kosten und steigere deinen Umsatz";

export default defineNuxtConfig({
  app: {
    head: {
      title: storeName,
      htmlAttrs: {
        lang: "de",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: storeDescription,
        },
        {
          property: "og:title",
          content: storeDescription,
        },
        {
          property: "og:description",
          content: storeDescription,
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
        cacheTtl: {
          product: 86400,
          crossSelling: 86400,
          listing: 86400,
          variant: 3600,
          category: 86400,
        },
        menuCategoryId: "",
        searchFallbackCategoryId: "",
        feature: {
          multiChannel: false,
          secureKey: "",
          contactForm: false,
        },
      },
      site: {
        name: storeName,
        description: storeDescription,
        countryId: "",
      },
      storeUrl: "",
    },
  },

  routeRules: {
    "/merkliste": {
      ssr: false,
    },
    "/registrierung/bestaetigen": {
      ssr: false,
    },
    "/bestellung": {
      redirect: "/bestellung/warenkorb",
    },
  },

  css: ["~/assets/css/main.css"],

  shopware: {
    endpoint: "",
    accessToken: "",
    devStorefrontUrl: "",
    useUserContextInSSR: true,
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
    "nuxt-vitalizer",
    "@nuxt/eslint",
    "@pinia/nuxt",
  ],

  content: {
    experimental: { sqliteConnector: "native" },
  },

  pwa: {
    registerType: "autoUpdate",
    manifest: {
      id: "/",
      scope: "/",
      name: storeName,
      short_name: storeName,
      description: storeDescription,
      theme_color: "#ff5b00",
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
      screenshots: [
        {
          src: "screenshot-mobile.png",
          sizes: "390x844",
          type: "image/png",
          form_factor: "narrow",
          label: storeName,
        },
        {
          src: "screenshot-desktop.png",
          sizes: "1280x800",
          type: "image/png",
          form_factor: "wide",
          label: storeName,
        },
      ],
      icons: [
        {
          src: "logo-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "logo-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "logo-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      globIgnores: ["**/_payload.json"],
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: "/",
          handler: "NetworkFirst",
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: "module",
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

  vite: {
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "zod",
        "@shopware/api-client",
        "@shopware/api-client/helpers",
        "uuid",
        "@shopware/helpers",
        "@vueuse/core",
      ],
    },
  },

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
      "@nuxt/ui",
      "@nuxt/scripts",
      "@nuxt/test-utils/module",
      "@nuxt/eslint",
      "@nuxt/hints",
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
