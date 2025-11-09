<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";
import { useRoute } from "vue-router";
import { useUser } from "@shopware/composables";

const route = useRoute();

const { isLoggedIn, user, logout } = useUser();
const { isCheckoutEnabled } = usePizzaToppings();

const { count } = useCart();

const loginSlide = ref(false);

const navi = computed<NavigationMenuItem[]>(() => [
  {
    label: "Start",
    icon: "i-lucide-home",
    to: "/",
    active: route.path.length === 1,
  },
  {
    label: "Speisekarte",
    icon: "i-lucide-utensils",
    to: "/speisekarte",
    active: route.path.endsWith("/speisekarte"),
  },
  {
    label: "Speisekarte 2",
    icon: "i-lucide-utensils",
    to: "/c/Pizza/",
    active: route.path.endsWith("/speisekarte2"),
  },
  {
    label: "Routenplaner",
    to: "https://www.openstreetmap.org/directions?from=&to=50.080610%2C8.863783#map=19/50.080323/8.864079",
    active: false,
    icon: "i-lucide-map-pinned",
    target: "_blank",
  },
  {
    label: "Merkliste",
    to: "/merkliste",
    icon: "i-lucide-book-heart",
    active: route.path.startsWith("/merkliste"),
  },
]);

const accountHoverText = computed(() => {
  return isLoggedIn.value
    ? user.value?.firstName + " " + user.value?.lastName
    : "Hallo";
});

const toast = useToast();

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolreich abgemeldet.",
    color: "success",
  });
};

const loggedInDropDown = ref<DropdownMenuItem[][]>([
  [
    {
      label: accountHoverText.value,
      type: "label",
    },
  ],
  [
    {
      label: "Konto",
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
      onSelect: logoutHandler,
    },
  ],
]);

const loggedOutDropDown = ref<DropdownMenuItem[][]>([
  [
    {
      label: "Jetzt anmelden",
      type: "label",
    },
  ],
  [
    {
      label: "Zur Anmeldung",
      icon: "i-lucide-user",
      to: "/anmelden",
    },
  ],
]);
const cartQuickViewOpen = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <NuxtLink to="/" class="-m-1.5 p-1.5">
        <span class="sr-only">Pizzeria La Fattoria</span>
        <UColorModeImage
          light="/light/Logo.svg"
          dark="/dark/Logo.svg"
          :width="200"
          :height="200"
        />
      </NuxtLink>
    </template>

    <UNavigationMenu color="primary" variant="pill" :items="navi" />

    <template #right>
      <UButton
        color="neutral"
        variant="ghost"
        to="tel:+49610471427"
        target="_blank"
        icon="i-lucide-phone"
        aria-label="Anrufen"
      />
      <UDropdownMenu :items="isLoggedIn ? loggedInDropDown : loggedOutDropDown">
        <UChip v-if="isLoggedIn" size="3xl" text="✓">
          <UButton icon="i-lucide-user" color="neutral" variant="outline" />
        </UChip>
        <UButton
          v-else
          icon="i-lucide-user"
          color="neutral"
          variant="outline"
        />
      </UDropdownMenu>
      <UDrawer
        v-if="isCheckoutEnabled"
        v-model:open="cartQuickViewOpen"
        title="Warenkorb"
        direction="right"
      >
        <UChip :text="count" size="3xl">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-shopping-cart"
          />
        </UChip>
        <template #body>
          <CartQuickView
            :with-to-cart-button="true"
            class="md:min-w-90"
            @go-to-cart="cartQuickViewOpen = false"
          />
        </template>
      </UDrawer>
    </template>

    <template #body>
      <UNavigationMenu
        color="primary"
        :items="navi"
        orientation="vertical"
        class="-mx-2.5"
      />
    </template>
  </UHeader>
  <USlideover
    v-model:open="loginSlide"
    title="Konto"
    description="Alle Vorteile eines Kontos genießen"
  >
    <template #body>
      <div class="h-full m-4">
        <UserLoginForm />
      </div>
    </template>
  </USlideover>
</template>
