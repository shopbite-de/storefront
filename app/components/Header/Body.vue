<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const { data: navigationData } = useAsyncData("navigation", () =>
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
</script>

<template>
  <UNavigationMenu
    color="primary"
    :items="navi"
    orientation="vertical"
    class="-mx-2.5"
  />
  <div class="my-4">
    <SalesChannelSwitch />
  </div>
</template>
