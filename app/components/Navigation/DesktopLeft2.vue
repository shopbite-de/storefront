<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { loadNavigationElements } = useNavigation();

const { data: navigationElements } = await useAsyncData(
  `menu-navigation`,
  async () => {
    return await loadNavigationElements({ depth: 3 });
  },
);

const mapCategoryToNavItem = (
  category: Schemas["Category"],
): NavigationMenuItem => {
  const label = category.translated?.name ?? "";

  return {
    label,
    description: `${label} Kategorie`,
    to: category.seoUrl,
    defaultOpen: true,
    children: (category.children ?? []).map(mapCategoryToNavItem),
  };
};

const navItems = computed<NavigationMenuItem[]>(() => {
  return (navigationElements.value ?? []).map(mapCategoryToNavItem);
});
</script>

<template>
  <div>
    <h2 class="text-3xl md:text-4xl mt-8 mb-3 pb-2">Speisekarte</h2>
    <UNavigationMenu
      variant="link"
      orientation="vertical"
      class="data-[orientation=vertical]:w-48"
      :items="navItems"
    />
  </div>
</template>
