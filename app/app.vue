<script setup lang="ts">
import Footer from "~/components/Footer.vue";

const { apiClient } = useShopwareContext();

// The footer is below the fold on every page; its hydration waits until it
// scrolls into view (#314).
const FooterWhenVisible = hydrateWhenVisible(Footer);

// The session's customer (ADR 0001, step 6), rendered on the server so the
// header knows the login on the first paint. Read in parallel with the
// layer's context: during an outage the page waits for one deadline, not
// two (step 6 review).
const { isLoggedIn, refresh: refreshCustomer } = useCustomer();
const [{ data: sessionContextData }] = await Promise.all([
  useAsyncData(
    "sessionContext",
    async () => {
      try {
        // with a deadline, without token and customer (`readLayerContext`)
        return (await readLayerContext(
          apiClient as unknown as Parameters<typeof readLayerContext>[0],
        )) as Awaited<
          ReturnType<typeof apiClient.invoke<"readContext get /context">>
        >["data"];
      } catch (error) {
        console.error(
          "Failed to load session context",
          (error as Error | null)?.name ?? "no answer",
        );
        return null;
      }
    },
    {
      default: () => null,
    },
  ),
  useAsyncData("customer", () =>
    refreshCustomer().catch((error) => {
      // the code only: the error of a request carries its options
      console.error(
        "[account] customer",
        domainErrorCode(error) ?? "no answer",
      );
      return null;
    }),
  ),
]);

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
const { load: loadWishlist, mergeGuestEntries } = useWishlistEntries();
onMounted(loadWishlist);
// a login or logout replaces the visitor's backend context: the methods
// of the next order may change with it
const { selection, refreshSelection } = useCheckoutMethods();
watch(isLoggedIn, (loggedIn, before) => {
  if (loggedIn === before) return;
  if (loggedIn) mergeGuestEntries();
  else loadWishlist();
  loadCart();
  if (selection.value) {
    refreshSelection().catch((error) =>
      console.error("[checkout] selection", error),
    );
  }
});

onMounted(loadCart);

// A new visitor gets the storefront session before the first write (ADR
// 0001, step 5): a write cut off by a navigation still lands in it. The
// server render tells whether the request brought a session (the
// browser cannot read it, it is HttpOnly; `plugins/visitor-has-session`
// asks whether it unseals).
const hasSession = useState("visitor-has-session", () => !import.meta.server);
onMounted(() => {
  if (hasSession.value) return;
  hasSession.value = true;
  queuedWrite(() => $fetch("/api/session", { method: "POST" })).catch((error) =>
    console.error("[session] start", error),
  );
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
