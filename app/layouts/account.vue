<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { useUser } from "@shopware/composables";
const toast = useToast();
const { isLoggedIn, logout } = useUser();

onMounted(() => {
  if (!isLoggedIn.value) {
    navigateTo("/anmelden");
  }
});

watch(isLoggedIn, (newValue) => {
  if (!newValue) {
    navigateTo("/anmelden");
  }
});

const logoutHandler = () => {
  logout();
  toast.add({
    title: "Tschüss!",
    description: "Erfolreich abgemeldet.",
    color: "success",
  });
};

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: "Übersicht",
      icon: "i-lucide-grip",
      to: "/konto",
    },
    {
      label: "Bestellungen",
      icon: "i-lucide-book-open",
      to: "/konto/bestellungen",
    },
    {
      label: "Persönliches Profil",
      icon: "i-lucide-user",
      to: "/konto/profil",
    },
    {
      label: "Adressen",
      icon: "i-lucide-house",
      to: "/konto/adressen",
    },
    {
      label: "Abmelden",
      icon: "i-lucide-log-out",
      onSelect: logoutHandler,
    },
  ],
]);
</script>
<template>
  <UContainer>
    <UPage>
      <template #left>
        <UNavigationMenu
          highlight
          highlight-color="primary"
          orientation="vertical"
          :items="items"
          class="data-[orientation=vertical] py-8"
        />
      </template>
      <slot />
      <BottomNavi />
    </UPage>
  </UContainer>
</template>
