<script setup lang="ts">
import { useUser } from "@shopware/composables";
import type { DropdownMenuItem } from "@nuxt/ui";

const cartQuickViewOpen = ref(false);
const { count } = useCart();
const { isCheckoutEnabled } = useShopBiteConfig();
const { isLoggedIn, isGuestSession, user, logout } = useUser();
const toast = useToast();

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolreich abgemeldet.",
    color: "success",
  });
};

const { data: navigationData } = await useAsyncData("navigation", () =>
  queryCollection("navigation").first(),
);

const accountHoverText = computed(() => {
  return isLoggedIn.value || isGuestSession.value
    ? `${user.value?.firstName} ${user.value?.lastName}`
    : "Hallo";
});

const loggedInDropDown = computed<DropdownMenuItem[][]>(() => {
  if (!navigationData.value?.account.loggedIn) return [];

  return navigationData.value.account.loggedIn
    .map((group) =>
      group
        .filter((item) => {
          if (isGuestSession.value) {
            return item.type === "label" || item.action === "logout";
          }
          return true;
        })
        .map((item) => ({
          label: item.type === "label" ? accountHoverText.value : item.label,
          type: item.type,
          icon: item.icon,
          to: item.to,
          onSelect: item.action === "logout" ? logoutHandler : undefined,
        })),
    )
    .filter((group) => group.length > 0);
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
  <UDropdownMenu
    :items="isLoggedIn || isGuestSession ? loggedInDropDown : loggedOutDropDown"
  >
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
        aria-label="Zum Warenkorb"
        color="neutral"
        variant="outline"
        icon="i-lucide-shopping-cart"
      />
    </UChip>

    <template #header>
      <h2 class="text-3xl md:text-4xl mt-8 mb-3 pb-2">
        <UIcon name="i-lucide-shopping-cart" class="size-8" color="primary" />
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

<style scoped></style>
