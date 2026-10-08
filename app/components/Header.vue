<script setup lang="ts">
import { useUser } from "@shopware/composables";

/**
 * Header of the presets (#455): logo, main navigation, store status,
 * phone, account, wishlist and the cart button with the item count, which
 * opens the cart sheet (#443). On phones a menu button opens a sheet with
 * the navigation and the account links. Logic as in Header/Right.vue.
 */
const { mainMenu } = useNavigation(false);
const { site, shopBite } = useRuntimeConfig().public;
const { colorMode } = useThemePreset();
// A logo URL from runtime config (NUXT_PUBLIC_SHOP_BITE_LOGO_URL, e.g. the
// lead demos) wins over the files in public/; the dark presets use dark/.
const logoSrc = computed(
  () =>
    (shopBite as { logoUrl?: string }).logoUrl ||
    (colorMode === "dark" ? "/dark/Logo.png" : "/light/Logo.png"),
);
const route = useRoute();

const {
  open: cartOpen,
  mounted: cartMounted,
  show: openCart,
} = useCartQuickView();
const { count: cartCount } = useCart();
const { count: wishlistCount } = useWishlist();
const { isCheckoutEnabled } = useShopBiteConfig();
const { isLoggedIn, isGuestSession, logout } = useUser();
const { status } = useStoreStatus();

// The cart button pops when a product goes into the cart (#325).
const { onCartItemAdded } = useProductEvents();
const cartPop = ref(0);
onCartItemAdded(() => {
  cartPop.value++;
});

const menuOpen = ref(false);
const menuMounted = ref(false);
async function openMenu() {
  if (!menuMounted.value) {
    menuMounted.value = true;
    await nextTick();
  }
  menuOpen.value = true;
}
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);

const hasAccount = computed(() => isLoggedIn.value || isGuestSession.value);

const statusLabel = computed(() => {
  if (!status.value) return "";
  if (status.value.open) return `Geöffnet bis ${status.value.closesAt}`;
  return status.value.nextOpening
    ? `Öffnet ${status.value.nextOpening}`
    : "Geschlossen";
});

const cartLabel = computed(() =>
  cartCount.value === 1
    ? "Warenkorb, 1 Artikel"
    : `Warenkorb, ${cartCount.value} Artikel`,
);

function isCurrent(to: unknown) {
  if (typeof to !== "string") return false;
  const normalize = (path: string) => path.replace(/\/+$/, "").toLowerCase();
  return normalize(route.path).startsWith(normalize(to)) && to !== "/";
}

function logoutHandler() {
  logout();
  menuOpen.value = false;
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-sb-line bg-sb-bg/95 font-body text-sb-ink backdrop-blur supports-[backdrop-filter]:bg-sb-bg/85"
  >
    <div
      class="mx-auto flex h-16 w-full max-w-(--sb-container) items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sb-focus"
        :aria-label="`${site.name}, zur Startseite`"
      >
        <img
          :src="logoSrc"
          alt=""
          width="150"
          height="48"
          class="h-9 w-auto sm:h-11"
        />
      </NuxtLink>

      <nav
        aria-label="Hauptnavigation"
        class="hidden items-center gap-8 lg:flex"
      >
        <NuxtLink
          v-for="item in mainMenu"
          :key="String(item.to)"
          :to="item.to"
          :aria-current="isCurrent(item.to) ? 'page' : undefined"
          class="inline-flex min-h-11 items-center text-[15px] font-semibold hover:text-sb-primary-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus aria-[current=page]:underline aria-[current=page]:decoration-sb-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
        >
          {{ item.label }}
        </NuxtLink>
        <LazySalesChannelSwitch v-if="shopBite.feature.multiChannel" />
      </nav>

      <div class="flex items-center gap-1.5 sm:gap-2">
        <ClientOnly>
          <!-- Wrappers do the hiding: the base components set their own
               display, which would win over a `hidden` passed to them. -->
          <span v-if="statusLabel" class="hidden xl:block">
            <SbStatusPill
              :tone="status?.open ? 'open' : 'closed'"
              role="status"
            >
              {{ statusLabel }}
            </SbStatusPill>
          </span>
        </ClientOnly>
        <SbIconButton
          v-if="site.telephone"
          :to="toTelHref(site.telephone)"
          :label="`Anrufen: ${site.telephone}`"
          variant="ghost"
        >
          <SbIcon name="phone" />
        </SbIconButton>
        <span class="hidden sm:block">
          <SbIconButton
            :to="hasAccount ? '/konto' : '/anmelden'"
            :label="hasAccount ? 'Mein Konto' : 'Anmelden'"
            variant="ghost"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </SbIconButton>
        </span>
        <span class="hidden sm:block">
          <SbIconButton
            to="/merkliste"
            :label="
              wishlistCount
                ? `Merkliste, ${wishlistCount} gemerkt`
                : 'Merkliste'
            "
            variant="ghost"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"
              />
            </svg>
            <span
              v-if="wishlistCount"
              aria-hidden="true"
              class="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-sb-ink px-1 text-[11px] leading-4 font-bold text-sb-surface"
              >{{ wishlistCount }}</span
            >
          </SbIconButton>
        </span>
        <SbButton
          v-if="isCheckoutEnabled"
          :key="cartPop"
          :class="{ 'motion-safe:animate-cart-pop': cartPop > 0 }"
          aria-haspopup="dialog"
          :aria-label="cartLabel"
          @click="openCart"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span class="hidden sm:inline" aria-hidden="true">Warenkorb</span>
          <span
            v-if="cartCount"
            aria-hidden="true"
            class="min-w-5 rounded-full bg-sb-on-primary/20 px-1.5 text-sm tabular-nums"
            >{{ cartCount }}</span
          >
        </SbButton>
        <span class="lg:hidden">
          <SbIconButton
            label="Menü öffnen"
            variant="ghost"
            aria-haspopup="dialog"
            @click="openMenu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </SbIconButton>
        </span>
      </div>
    </div>
  </header>

  <SbSheet v-if="menuMounted" v-model:open="menuOpen" title="Menü">
    <nav aria-label="Hauptnavigation mobil" class="flex flex-col font-body">
      <NuxtLink
        v-for="item in mainMenu"
        :key="String(item.to)"
        :to="item.to"
        :aria-current="isCurrent(item.to) ? 'page' : undefined"
        class="flex min-h-14 items-center justify-between border-b border-sb-line font-display text-2xl text-sb-ink focus-visible:outline-3 focus-visible:outline-sb-focus"
      >
        {{ item.label }}
        <SbIcon name="chevron-right" class="text-sb-ink-muted" />
      </NuxtLink>
    </nav>
    <div class="mt-6 flex flex-col gap-2 font-body">
      <template v-if="hasAccount">
        <SbButton variant="secondary" to="/konto">Mein Konto</SbButton>
        <SbButton variant="secondary" to="/konto/bestellungen"
          >Bestellungen</SbButton
        >
        <SbButton variant="ghost" @click="logoutHandler">Abmelden</SbButton>
      </template>
      <template v-else>
        <SbButton variant="secondary" to="/anmelden">Anmelden</SbButton>
        <SbButton variant="ghost" to="/registrierung">Registrieren</SbButton>
      </template>
      <SbButton variant="ghost" to="/merkliste">Merkliste</SbButton>
    </div>
    <div v-if="shopBite.feature.multiChannel" class="mt-4">
      <LazySalesChannelSwitch />
    </div>
  </SbSheet>

  <SbSheet v-if="cartMounted" v-model:open="cartOpen" title="Ihre Bestellung">
    <LazyCartQuickView
      :with-to-cart-button="true"
      @go-to-cart="cartOpen = false"
    />
  </SbSheet>
</template>
