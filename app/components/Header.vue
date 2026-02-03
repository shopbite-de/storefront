<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const { data: navigationData } = await useAsyncData("navigation", () =>
  queryCollection("navigation").first(),
);

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

const loginSlide = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <HeaderTitle />
    </template>

    <UNavigationMenu color="primary" variant="pill" :items="navi" />

    <template #right>
      <HeaderRight />
    </template>

    <template #body>
      <HeaderBody />
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
