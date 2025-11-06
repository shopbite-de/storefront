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
    "/_ipx/**": {
      prerender: false,
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
    ...process.env.NODE_ENV === 'development' ? [
      "@nuxt/test-utils/module",
      "@nuxt/eslint"
    ] : [],
  ],

  plausible: {
    ignoredHostnames: ["localhost"],
  },

  pwa: {
    manifest: {
      name: "ShopBite",
      short_name: "ShopBite",
      theme_color: "#4d7c0f",
      icons: [
        {
          src: "lafattoria192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "lafattoria512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "lafattoria512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
  },

  nitro: {
    preset: 'bun',
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
    prerender: {
      failOnError: false,
      ignore: ['/_ipx/**'],
    },
  },

  devtools: { enabled: true },
  extends: ["@shopware/composables/nuxt-layer"],
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: "2024-11-27",

  experimental: {
    asyncContext: true,
  },

  vite: {
    build: {
      cssCodeSplit: true,
    },
    css: {
      preprocessorOptions: {},
    },
  },
});
