<script setup lang="ts">
import { useUser } from "@shopware/composables";
import type { DropdownMenuItem } from "@nuxt/ui";
import { useMediaQuery } from "@vueuse/core";

const {
  open: cartQuickViewOpen,
  mounted: cartQuickViewMounted,
  show: openCartQuickView,
} = useCartQuickView();
// Bottom sheet on phones (also opened from the cart bar), side panel from
// the lg breakpoint (64rem); the drawer only renders on the client (#325).
const isDesktop = useMediaQuery("(min-width: 64rem)");
const cartDrawerDirection = computed(() =>
  isDesktop.value ? "right" : "bottom",
);

const { count: cartCount } = useCart();

// The cart badge pops when a product goes into the cart (#325).
const { onCartItemAdded } = useProductEvents();
const cartPop = ref(0);
onCartItemAdded(() => {
  cartPop.value++;
});
const { count: wishListCount } = useWishlist();
const { isCheckoutEnabled } = useShopBiteConfig();
const { isLoggedIn, isGuestSession, logout } = useUser();
const toast = useToast();
// Shop phone number from the site config; the button is hidden without one (#251).
const { site } = useRuntimeConfig().public;

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolreich abgemeldet.",
    color: "success",
  });
};

const dropDownMenu = computed<DropdownMenuItem[][]>(() => {
  if (isLoggedIn.value) {
    return [
      [
        {
          label: "Mein Konto",
          type: "label",
        },
        {
          label: "Übersicht",
          icon: "i-lucide-user",
          to: "/konto",
        },
        {
          label: "Bestellungen",
          icon: "i-lucide-pizza",
          to: "/konto/bestellungen",
        },
        {
          label: "Adressen",
          icon: "i-lucide-house",
          to: "/konto/adressen",
        },
      ],
      [
        {
          label: "Abmelden",
          icon: "i-lucide-log-out",
          onSelect: () => logoutHandler(),
        },
      ],
    ];
  } else {
    return [
      [
        {
          label: "Mein Konto",
          type: "label",
        },
        {
          label: "Anmelden",
          icon: "i-lucide-user",
          to: "/anmelden",
        },
        {
          label: "Registrieren",
          icon: "i-lucide-user-plus",
          to: "/registrierung",
        },
      ],
    ];
  }
});
</script>

<template>
  <UButton
    v-if="site.telephone"
    color="neutral"
    variant="ghost"
    :to="toTelHref(site.telephone)"
    icon="i-lucide-phone"
    :aria-label="`Anrufen: ${site.telephone}`"
  />
  <UDropdownMenu :items="dropDownMenu">
    <UChip v-if="isLoggedIn || isGuestSession" size="3xl" text="✓">
      <UButton
        aria-label="Konto Dropdown öffnen"
        icon="i-lucide-user"
        color="neutral"
        variant="outline"
      />
    </UChip>
    <UButton
      v-else
      aria-label="Konto Dropdown öffnen"
      icon="i-lucide-user"
      color="neutral"
      variant="ghost"
    />
  </UDropdownMenu>
  <div>
    <UChip :text="wishListCount" size="3xl">
      <UButton
        aria-label="Zur Merkliste"
        color="neutral"
        variant="ghost"
        to="/merkliste"
        icon="i-lucide-heart"
      />
    </UChip>
  </div>
  <UChip
    v-if="isCheckoutEnabled"
    :key="cartPop"
    :text="cartCount"
    size="3xl"
    :class="{ 'motion-safe:animate-cart-pop': cartPop > 0 }"
  >
    <UButton
      aria-label="Zum Warenkorb"
      aria-haspopup="dialog"
      color="neutral"
      variant="ghost"
      icon="i-lucide-shopping-bag"
      @click="openCartQuickView"
    />
  </UChip>
  <LazyUDrawer
    v-if="cartQuickViewMounted"
    v-model:open="cartQuickViewOpen"
    title="Warenkorb"
    :direction="cartDrawerDirection"
    :ui="{
      content:
        cartDrawerDirection === 'right' ? 'w-full max-w-md' : 'max-h-[92vh]',
    }"
  >
    <template #header>
      <div class="h-full flex flex-col justify-center">
        <h2
          class="flex items-center gap-2 text-3xl md:text-4xl mb-3 pb-2 lg:mt-8"
        >
          <UIcon name="i-lucide-shopping-bag" class="size-8" color="primary" />
          Warenkorb
        </h2>
      </div>
    </template>
    <template #body>
      <LazyCartQuickView
        :with-to-cart-button="true"
        class="md:min-w-90"
        @go-to-cart="cartQuickViewOpen = false"
      />
    </template>
  </LazyUDrawer>
</template>
