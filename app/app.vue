<script setup lang="ts">
import Footer from "~/components/Footer.vue";

const { apiClient } = useShopwareContext();

// The footer is below the fold on every page; its hydration waits until it
// scrolls into view (#314).
const FooterWhenVisible = hydrateWhenVisible(Footer);

const { data: sessionContextData } = await useAsyncData(
  "sessionContext",
  async () => {
    try {
      const { data } = await apiClient.invoke("readContext get /context");
      // The context token stays on the server (ADR 0001, step 4): the
      // context goes into the page payload without it.
      const { token: _token, ...context } = data;
      return context as typeof data;
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

// Opening hours, holidays, the switch that accepts orders and the lead
// times feed the store status (HeaderStoreStatus), the wished time choice
// and the order buttons. The server renders them from its caches; after
// hydration the browser loads their live values (useLiveShopData).
useOpeningHours();
useHolidays();
useShopConfig();
useShippingMethods();
useLiveShopData();

// The cart (ADR 0001, step 4) is loaded in the browser; a login or logout
// changes the visitor's session (Shopware merges the guest's cart into the
// customer's), so the cart is loaded again.
const { refresh: refreshCart } = useCartData();
const loadCart = () =>
  refreshCart().catch((error) => console.error("[cart] refresh", error));
// Wishlist entries (#467): loaded in the browser, not during SSR. A login
// moves the guest entries into the account, a logout shows the guest's.
const { isLoggedIn } = useUser();
const { load: loadWishlist, mergeGuestEntries } = useWishlistEntries();
onMounted(loadWishlist);
watch(isLoggedIn, (loggedIn, before) => {
  if (loggedIn === before) return;
  if (loggedIn) mergeGuestEntries();
  else loadWishlist();
  loadCart();
});

onMounted(loadCart);

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
  <NuxtPwaManifest />
  <NuxtLoadingIndicator />

  <div>
    <!-- First focusable element: skips header and navigation (#455). -->
    <a
      href="#inhalt"
      class="sr-only z-[60] rounded-md bg-neutral-950 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >Zum Inhalt springen</a
    >
    <LazyDemoBanner v-if="shopBite.feature.demoBanner" />
    <Header />
    <main id="inhalt" tabindex="-1" class="min-h-[60vh] focus:outline-none">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </main>
    <FooterWhenVisible />
    <CartBar />
  </div>
</template>
