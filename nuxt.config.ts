// https://v3.nuxtjs.org/api/configuration/nuxt.config
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

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
    shopBite: {
      // Shop backend adapter behind the server routes (ADR 0001):
      // "shopware" or "memory" (in-memory demo restaurant),
      // NUXT_SHOP_BITE_BACKEND. Only routes moved to the ports use it.
      backend: "shopware",
      // IANA time zone of opening hours, holidays and wished times
      // (NUXT_SHOP_BITE_TIME_ZONE); the ShopBite plugin uses the sales
      // channel's business time zone, else Europe/Berlin.
      timeZone: "Europe/Berlin",
    },
    // The Shopware adapter's Store API (server/adapters/shopware/connection.ts):
    // NUXT_SHOPWARE_ENDPOINT (e.g. "https://shop.example/store-api", or an
    // internal address so Shopware sees the visitor's X-Forwarded-For) and
    // NUXT_SHOPWARE_ACCESS_TOKEN (the sales channel's access key). Private:
    // the browser never talks to Shopware. Production does not start
    // without both while shopBite.backend is "shopware". The public names
    // of 2.x (NUXT_PUBLIC_SHOPWARE_*) are still read on the server in 3.x.
    shopware: {
      endpoint: "",
      accessToken: "",
    },
    // Secret of POST /api/_cache/purge (#484), the backoffice empties the
    // Store API caches after menu changes. Empty = route off.
    cachePurgeSecret: "",
    geoapifyApiKey: "",
    // Per-IP token bucket of /api/address/autocomplete: `capacity` lookups at
    // once, refilled by `refillPerMinute`; only lookups that reach Geoapify
    // count. In memory per server process; capacity 0 turns it off (e.g. when
    // the reverse proxy limits the route).
    addressAutocomplete: {
      rateLimit: {
        capacity: 20,
        refillPerMinute: 20,
      },
    },
    // The storefront session (ADR 0001, step 4; server/utils/visitorSession.ts):
    // an HttpOnly cookie that carries the backend's token sealed (AES-GCM)
    // with `password` (NUXT_VISITOR_SESSION_PASSWORD, at least 32 random
    // characters; required in production, the server does not start
    // without it). A rotation moves the old password to
    // `previousPasswords` (comma-separated), which still opens cookies.
    // Drop a previous password only `maxAgeDays` after the rotation: a
    // cookie it sealed is sealed again with the current one on its visit.
    // A session lives `maxAgeDays` after the visitor's last visit.
    // `allowedOrigins`: further origins of the shop (comma-separated, e.g.
    // "https://www.shop.example") whose pages may write (CSRF check), next
    // to `public.storeUrl`; NUXT_VISITOR_SESSION_ALLOWED_ORIGINS.
    visitorSession: {
      maxAgeDays: 30,
      password: "",
      previousPasswords: "",
      allowedOrigins: "",
    },
    // Bound of the Nitro cache (server/plugins/bounded-cache.ts): an LRU in
    // memory with at most `maxEntries` entries and `maxSizeMb` of data;
    // NUXT_CACHE_STORAGE_*, maxEntries 0 = unbounded. A cache storage the
    // shop mounts itself (nitro.storage.cache) is kept.
    cacheStorage: {
      maxEntries: 5000,
      maxSizeMb: 128,
    },
    // Sortings the listing and search routes accept (`order`), comma-
    // separated; empty = Shopware's standard sortings. Add the keys of
    // custom sortings created in the Shopware Administration.
    listingSortings: "",
    // AI crawlers named in robots.txt (#403, server/plugins/ai-crawlers.ts):
    // search = AI search and assistant fetches, training = model training.
    aiCrawlers: {
      search: true,
      training: true,
    },
    // Headers of every response (server/plugins/security-headers.ts),
    // NUXT_SECURITY_HEADERS_*; an empty value leaves the header out.
    securityHeaders: {
      // Only sent when public.storeUrl is https.
      strictTransportSecurity: "max-age=31536000; includeSubDomains",
      contentTypeOptions: "nosniff",
      // A shop embedded in another site sets frameOptions "" and lists the
      // embedding origin in frameAncestors (CSP `frame-ancestors`).
      frameOptions: "DENY",
      frameAncestors: "'none'",
      referrerPolicy: "strict-origin-when-cross-origin",
      // No feature of the storefront uses these (address suggestions are
      // typed, not located); Web Share and the clipboard stay allowed.
      permissionsPolicy:
        "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()",
      // Server-rendered HTML may contain the visitor's cart or login, so
      // no shared or browser cache keeps it.
      htmlCacheControl: "private, no-store",
      // Report-only policy for pages: self, Matomo
      // and inline scripts by hash. Extra hosts (e.g. a RUM collector) are
      // space-separated lists.
      contentSecurityPolicyReportOnly: {
        enabled: true,
        scriptSrc: "",
        connectSrc: "",
        imgSrc: "",
        reportUri: "",
      },
    },
    public: {
      shopBite: {
        cacheTtl: {
          product: 86400,
          crossSelling: 86400,
          listing: 86400,
          variant: 3600,
          category: 86400,
          // Layout data of every page (navigation, SEO URLs, breadcrumbs,
          // plugin config, hours): the server renders it from these caches,
          // so a request (also a 404) does not ask Shopware for it again.
          navigation: 86400,
          // SEO URL matches and the list of known category paths: a new or
          // renamed section must not 404 for long without a purge.
          seoUrl: 600,
          paymentMethods: 3600,
          // Carries the checkout switch, so short; the browser reloads it
          // from Shopware after hydration (useLiveShopData).
          config: 60,
          businessHours: 300,
          holidays: 300,
        },
        menuCategoryId: "",
        searchFallbackCategoryId: "",
        // Optional Geoapify bounding box "lon1,lat1,lon2,lat2" that narrows
        // the address suggestions in the checkout (empty = no filter, #251).
        // Applied by the server route, never taken from the request.
        addressAutocomplete: {
          boundingBox: "",
        },
        feature: {
          multiChannel: false,
          secureKey: "",
          contactForm: false,
          // Shows a non-dismissible notice above the header that the shop
          // is a demo and orders are not fulfilled (demo shops in demos/).
          demoBanner: false,
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
        // Other names the shop is known by on maps and directories, comma-
        // separated ("Esempio / Alter Hof, Alter Hof"), so search
        // engines and AI assistants match them to this shop. Restaurant
        // schema `alternateName` and /llms.txt.
        alternateNames: "",
        // Restaurant schema only, e.g. "€€" (#272).
        priceRange: "",
        // Restaurant schema only (#401): comma-separated delivery areas
        // ("12345 Musterstadt, 12346 Beispieldorf"), coordinates and
        // "true"/"false" or a text for table reservations.
        deliveryAreas: "",
        geo: {
          latitude: "",
          longitude: "",
        },
        acceptsReservations: "",
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
    // Rebuilt at most hourly: hours, closing days and the menu change rarely
    // (#402).
    "/llms.txt": {
      swr: 3600,
    },
    "/merkliste": {
      ssr: false,
    },
    "/registrierung/bestaetigen": {
      ssr: false,
    },
    // One-page checkout (#443): the old step routes lead there.
    "/bestellung": { redirect: { to: "/bestellung/kasse", statusCode: 301 } },
    "/bestellung/warenkorb": {
      redirect: { to: "/bestellung/kasse", statusCode: 301 },
    },
    "/bestellung/zahlung-versand": {
      redirect: { to: "/bestellung/kasse", statusCode: 301 },
    },
    "/bestellung/bestaetigen": {
      redirect: { to: "/bestellung/kasse", statusCode: 301 },
    },
  },

  // Style preset of the shop (#439, modules/theme.ts): "trattoria" (the
  // default), "grill" or "asia", optionally with colour overrides
  // (`colors: { primary: … }`). NUXT_SHOPBITE_PRESET overrides it.
  shopBite: {
    preset: "trattoria",
  },

  // Absolute: `~` would point to the app/ folder of a shop extending this
  // layer, which may have no main.css (2.0.1).
  css: [fileURLToPath(new URL("./app/assets/css/main.css", import.meta.url))],

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

  image: {
    // Logos resized by IPX: 30 days like the files in public/
    // (modules/public-cache.ts, #273) instead of IPX's 60 seconds.
    ipx: { maxAge: 2592000 },
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
    // Style presets (#439); registers the preset fonts, so it comes before
    // @nuxt/fonts. The same path in modules/ is not registered a second time.
    fileURLToPath(new URL("./modules/theme.ts", import.meta.url)),
    "@nuxt/fonts",
    "@nuxt/scripts",
    "nuxt-vitalizer",
    // @nuxt/eslint, @nuxt/hints and @nuxt/test-utils: modules/dev-tooling.ts
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
    // `workbox` before @vite-pwa/nuxt 2.
    generateSW: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      globIgnores: ["**/_payload.json"],
      // The module adds a `**/_payload.json` pattern because Nuxt Content
      // prerenders its database dumps; no page payload exists, and since
      // 2.0 an empty pattern fails the build unless globStrict is off (the
      // warning of 1.x).
      globStrict: false,
      // default of 1.x, off by default since 2.0
      cleanupOutdatedCaches: true,
      // No runtime caching of pages: server-rendered HTML may contain the
      // visitor's cart or login and must not be kept in CacheStorage.
      navigateFallback: null,
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
    // Tailwind CSS v4 (came with @nuxt/ui before #445)
    plugins: [tailwindcss()],
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
                test: /node_modules\/(\.pnpm\/)?(vue|@vue\+|@vue\/|vue-router|unhead|@unhead|nuxt@|hookable|ofetch|ufo|defu|h3|devalue|klona|destr|cookie-es|radix3|rou3|unctx)[@/]/,
                minShareCount: 2,
                priority: 20,
              },
              {
                name: "ui",
                test: /node_modules\/(\.pnpm\/)?(reka-ui|@floating-ui|@vueuse|@internationalized)[@/]/,
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
});
