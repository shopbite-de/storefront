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

if (import.meta.client) {
  // getting the wishlist products should not block SSR
  if (!(router.currentRoute.value.name as string).includes("wishlist")) {
    getWishlistProducts(); // initial page loading
  }
}

onMounted(async () => {
  await Promise.all([refreshHolidays(), refreshBusinessHours()]);
  refreshCart();
});

const route = useRoute();
const siteConfig = useSiteConfig();
const { site } = useRuntimeConfig().public;

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
    <Header />
    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>
    <FooterWhenVisible />
  </UApp>
</template>
