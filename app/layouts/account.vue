<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { useUser } from "@shopware/composables";
const toast = useToast();
const { hasPreset } = useThemePreset();
const route = useRoute();

// Account navigation of the presets (#445).
const presetLinks = [
  { label: "Übersicht", to: "/konto" },
  { label: "Bestellungen", to: "/konto/bestellungen" },
  { label: "Profil", to: "/konto/profil" },
  { label: "Adressen", to: "/konto/adressen" },
];
const isCurrent = (to: string) =>
  to === "/konto"
    ? route.path === to
    : route.path === to ||
      route.path.startsWith(`${to}/`) ||
      (to === "/konto/bestellungen" &&
        route.path.startsWith("/konto/bestellung/"));
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
  <div
    v-if="hasPreset"
    class="mx-auto w-full max-w-(--sb-container) px-4 pt-8 pb-16 font-body text-sb-ink sm:px-6 sm:pt-12 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12 lg:px-8"
  >
    <nav aria-label="Kundenkonto" class="mb-8 lg:mb-0">
      <ul
        class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      >
        <li v-for="link in presetLinks" :key="link.to" class="shrink-0">
          <NuxtLink
            :to="link.to"
            :aria-current="isCurrent(link.to) ? 'page' : undefined"
            class="flex min-h-11 items-center rounded-sb-control px-4 font-semibold whitespace-nowrap hover:bg-sb-muted focus-visible:outline-3 focus-visible:outline-sb-focus aria-[current=page]:bg-sb-primary-tint aria-[current=page]:text-sb-primary-ink"
            >{{ link.label }}</NuxtLink
          >
        </li>
        <li class="shrink-0 lg:mt-4 lg:border-t lg:border-sb-line lg:pt-4">
          <button
            type="button"
            class="flex min-h-11 w-full items-center rounded-sb-control px-4 font-semibold whitespace-nowrap text-sb-ink-muted hover:bg-sb-muted focus-visible:outline-3 focus-visible:outline-sb-focus"
            @click="logoutHandler"
          >
            Abmelden
          </button>
        </li>
      </ul>
    </nav>
    <div class="min-w-0">
      <slot />
    </div>
  </div>
  <UContainer v-else>
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
    </UPage>
  </UContainer>
</template>
