<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";
import { useRoute } from "vue-router";
import { useUser } from "@shopware/composables";

const route = useRoute();
const toast = useToast();

const { isLoggedIn, user, logout } = useUser();
const { isCheckoutEnabled } = usePizzaToppings();
const { count } = useCart();
const runtimeConfig = useRuntimeConfig();

// Fetch navigation from content
const { data: navigationData } = await useAsyncData("header-navigation", () =>
  queryCollection("navigation").first(),
);

const siteName = computed(() => runtimeConfig.public.site?.name ?? "ShopBite");

const navi = computed<NavigationMenuItem[]>(() => {
  if (!navigationData.value?.main) return [];

  return navigationData.value.main.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: item.to,
    target: item.target,
    active:
      item.to === "/"
        ? route.path.length === 1
        : route.path.startsWith(item.to),
  }));
});

const accountHoverText = computed(() => {
  return isLoggedIn.value
    ? `${user.value?.firstName} ${user.value?.lastName}`
    : "Hallo";
});

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolreich abgemeldet.",
    color: "success",
  });
};

const loggedInDropDown = computed<DropdownMenuItem[][]>(() => {
  if (!navigationData.value?.account.loggedIn) return [];

  return navigationData.value.account.loggedIn.map((group) =>
    group.map((item) => ({
      label: item.type === "label" ? accountHoverText.value : item.label,
      type: item.type,
      icon: item.icon,
      to: item.to,
      onSelect: item.action === "logout" ? logoutHandler : undefined,
    })),
  );
});

const loggedOutDropDown = computed<DropdownMenuItem[][]>(() => {
  if (!navigationData.value?.account.loggedOut) return [];

  return navigationData.value.account.loggedOut.map((group) =>
    group.map((item) => ({
      label: item.label,
      type: item.type,
      icon: item.icon,
      to: item.to,
    })),
  );
});

const loginSlide = ref(false);
const cartQuickViewOpen = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <NuxtLink to="/" class="-m-1.5 p-1.5">
        <span class="sr-only">{{ siteName }}</span>
        <UColorModeImage
          light="/light/Logo.svg"
          dark="/dark/Logo.svg"
          class="h-12 w-auto"
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

        <template #header>
          <h2 class="text-3xl md:text-4xl mt-8 mb-3 pb-2">
            <UIcon
              name="i-lucide-shopping-cart"
              class="size-8"
              color="primary"
            />
            Warenkorb
          </h2>
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
