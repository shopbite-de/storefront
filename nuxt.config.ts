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
          content: storeName,
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
  sitemap: {
    // File-based pages and route rules (ssr/swr/redirect) are checkout and
    // account flows; indexable URLs come from the home page, content pages
    // and the Store API source.
    excludeAppSources: ["nuxt:pages", "nuxt:route-rules"],
    urls: ["/"],
    sources: ["/api/__sitemap__/urls"],
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
        // Optional Geoapify bounding box "lon1,lat1,lon2,lat2" that narrows
        // the address suggestions in the checkout (empty = no filter, #251).
        addressAutocomplete: {
          boundingBox: "",
        },
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
        // `%s` = page title, `%siteName` = site.name; the home page renders
        // its title without the template.
        titleTemplate: "%s | %siteName – Online bestellen",
        // Share preview for pages without their own image (path or URL).
        ogImage: "/card.png",
        // Used in the default home page title and description.
        cuisine: "",
        // Shown in the footer (NAP for local SEO, #290) and in the Restaurant
        // schema (#272); empty values are left out.
        address: {
          street: "",
          postalCode: "",
          city: "",
          country: "DE",
        },
        telephone: "",
        googleBusinessProfileUrl: "",
        // Restaurant schema only, e.g. "€€" (#272).
        priceRange: "",
      },
      storeUrl: "",
      // Matomo config, runtime-overridable via NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*
      // env vars. Never set these as registry options: those are inlined into
      // the build and shadow the runtime config (#259). Matomo only loads when
      // both values are set (app/plugins/matomo.ts, #294).
      scripts: {
        matomoAnalytics: {
          matomoUrl: "",
          siteId: "",
        },
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
    "/bestellung": {
      redirect: "/bestellung/warenkorb",
    },
  },

  css: ["~/assets/css/main.css"],

  fonts: {
    defaults: {
      // Metric fallback faces for the font swap period: only the system
      // fonts of phones (Roboto on Android, Helvetica Neue on iOS). Every
      // family in the font stack costs a system font lookup per text style
      // during the first layout; the five module defaults were ~0.4 s of
      // Style & Layout in Lighthouse mobile (#319).
      fallbacks: {
        "sans-serif": ["Roboto", "Helvetica Neue"],
      },
    },
  },

  ui: {
    experimental: {
      // Only the theme files of the Nuxt UI components the layers render
      // become Tailwind sources (instead of all 120 components), see #319.
      componentDetection: true,
    },
  },

  shopware: {
    endpoint: "",
    accessToken: "",
    devStorefrontUrl: "",
    useUserContextInSSR: true,
  },

  modules: [
    "@shopware/nuxt-module",
    "@nuxt/image",
    // must be loaded before @nuxt/content for the content integration
    "@nuxtjs/sitemap",
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
    build: {
      // Vite 8 bundles with Rolldown; `rollupOptions` would drop this key.
      rolldownOptions: {
        output: {
          // Rolldown code splitting: the framework and UI libraries used by
          // more than one chunk go into two shared chunks instead of ~60
          // tiny ones, which halves the module preloads of every page (#314).
          codeSplitting: {
            groups: [
              {
                name: "framework",
                test: /node_modules\/(\.pnpm\/)?(vue|@vue\+|@vue\/|vue-router|unhead|@unhead|nuxt@|hookable|ofetch|ufo|defu|h3|devalue|klona|destr|cookie-es|radix3|rou3|unctx|pinia)[@/]/,
                minShareCount: 2,
                priority: 20,
              },
              {
                name: "ui",
                test: /node_modules\/(\.pnpm\/)?(reka-ui|@nuxt\+ui|@nuxt\/ui|tailwind-variants|tailwind-merge|@floating-ui|@vueuse|vaul-vue|@internationalized|@tanstack|@nuxt\+icon|@nuxt\/icon|@iconify)[@/]/,
                minShareCount: 2,
                priority: 10,
              },
            ],
          },
        },
      },
    },
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
    defaults: {
      nuxtLink: {
        // Prefetch route chunks on hover/touch instead of for every link in
        // view: the header alone pulled ~20 chunks and a page stylesheet
        // during the initial load (#314).
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },
  $development: {
    modules: [
      "@shopware/nuxt-module",
      "@nuxt/image",
      "@nuxtjs/sitemap",
      "@nuxt/content",
      "@nuxtjs/robots",
      "@nuxt/ui",
      "@nuxt/scripts",
      "@nuxt/test-utils/module",
      "@nuxt/eslint",
      "@nuxt/hints",
    ],
  },
});
