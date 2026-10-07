<script setup lang="ts">
import Footer from "~/components/Footer.vue";

const { apiClient } = useShopwareContext();
const appConfig = useAppConfig();
const router = useRouter();

// The footer is below the fold on every page; its hydration waits until it
// scrolls into view (#314).
const FooterWhenVisible = hydrateWhenVisible(Footer);

const { data: sessionContextData } = await useAsyncData(
  "sessionContext",
  async () => {
    try {
      const { data } = await apiClient.invoke("readContext get /context");
      return data;
    } catch (error) {
      console.error("Failed to load session context", error);
      return null;
    }
  },
  {
    default: () => null,
  },
);

const { setPriceConfig } = useCommercePrice();

if (sessionContextData.value) {
  setPriceConfig({
    currencyCode: sessionContextData.value.currency?.isoCode,
    localeCode: sessionContextData.value.languageInfo?.localeCode,
  });
  useSessionContext(sessionContextData.value);
}

// Business hours and holidays feed the store status in the header
// (HeaderStoreStatus) and the delivery time selection.
const { refresh: refreshBusinessHours } = useBusinessHours();
const { refresh: refreshHolidays } = useHolidays();

const { refreshCart } = useCart();
const { getWishlistProducts } = useWishlist();

// The wishlist page (app/pages/merkliste.vue) loads the products itself.
const WISHLIST_ROUTE_NAME = "merkliste";

if (import.meta.client) {
  // getting the wishlist products should not block SSR
  if (router.currentRoute.value.name !== WISHLIST_ROUTE_NAME) {
    getWishlistProducts(); // initial page loading
  }
}

onMounted(async () => {
  await Promise.all([refreshHolidays(), refreshBusinessHours()]);
  refreshCart();
});

const route = useRoute();
const siteConfig = useSiteConfig();
const { site, shopBite } = useRuntimeConfig().public;

// Pages with a backend SEO URL (categories) override the canonical link.
const canonicalUrl = computed(() => toAbsoluteUrl(siteConfig.url, route.path));

useHead({
  htmlAttrs: {
    lang: "de",
  },
  titleTemplate: (title) =>
    formatPageTitle(title, site.name, site.titleTemplate),
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: "/favicon.ico",
    },
    {
      rel: "canonical",
      key: "canonical",
      href: canonicalUrl,
    },
  ],
});

useSeoMeta({
  ogUrl: canonicalUrl,
  ogType: "website",
  ogSiteName: site.name,
  ogLocale: (
    sessionContextData.value?.languageInfo?.localeCode ?? "de-DE"
  ).replace("-", "_"),
  ogImage: site.ogImage
    ? toAbsoluteUrl(siteConfig.url, site.ogImage)
    : undefined,
  twitterCard: "summary_large_image",
});
</script>

<template>
  <VitePwaManifest />
  <NuxtLoadingIndicator />

  <UApp :toaster="appConfig.toaster">
    <!-- Lazy keeps UBanner out of the entry chunk of real shops (#314). -->
    <!-- First focusable element: skips header and navigation (#455). -->
    <a
      href="#inhalt"
      class="sr-only z-[60] rounded-md bg-neutral-950 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >Zum Inhalt springen</a
    >
    <LazyDemoBanner v-if="shopBite.feature.demoBanner" />
    <Header />
    <UMain id="inhalt" tabindex="-1" class="focus:outline-none">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>
    <FooterWhenVisible />
    <CartBar />
  </UApp>
</template>
