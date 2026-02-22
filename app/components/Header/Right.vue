<script setup lang="ts">
import { useUser } from "@shopware/composables";
import type { DropdownMenuItem } from "@nuxt/ui";

const cartQuickViewOpen = ref(false);
const { count: cartCount } = useCart();
const { count: wishListCount } = useWishlist();
const { isCheckoutEnabled } = useShopBiteConfig();
const { isLoggedIn, isGuestSession, logout } = useUser();
const toast = useToast();

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
    color="neutral"
    variant="ghost"
    to="tel:+49610471427"
    target="_blank"
    icon="i-lucide-phone"
    aria-label="Anrufen"
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
  <UDrawer
    v-if="isCheckoutEnabled"
    v-model:open="cartQuickViewOpen"
    title="Warenkorb"
    direction="right"
  >
    <UChip :text="cartCount" size="3xl">
      <UButton
        aria-label="Zum Warenkorb"
        color="neutral"
        variant="ghost"
        icon="i-lucide-shopping-bag"
      />
    </UChip>

    <template #header>
      <div class="h-full flex flex-col justify-center">
        <h2 class="flex items-center gap-2 text-3xl md:text-4xl mt-8 mb-3 pb-2">
          <UIcon name="i-lucide-shopping-bag" class="size-8" color="primary" />
          Warenkorb
        </h2>
      </div>
    </template>
    <template #body>
      <CartQuickView
        :with-to-cart-button="true"
        class="md:min-w-90"
        @go-to-cart="cartQuickViewOpen = false"
      />
    </template>
  </UDrawer>
</template>
