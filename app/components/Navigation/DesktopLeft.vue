<script setup lang="ts">
import type { Category } from "~/types/commerce/category";
import type { NavigationMenuItem } from "@nuxt/ui";
import { useNavigation } from "~/composables/useNavigation";

const { menuCardNavigation } = useNavigation(true);

const mapCategoryToNavItem = (category: Category): NavigationMenuItem => {
  const label = category.translated?.name ?? category.name;

  return {
    label,
    description: `${label} Kategorie`,
    to: category.translated?.seoUrl ?? category.seoUrl,
    defaultOpen: true,
    icon: (category.customFields as Record<string, unknown> | undefined)
      ?.shopbite_category_icon as string | undefined,
    children: category.children?.length
      ? category.children.map(mapCategoryToNavItem)
      : undefined,
  };
};

const navItems = computed<NavigationMenuItem[]>(() => {
  return (menuCardNavigation.value ?? []).map(mapCategoryToNavItem);
});
</script>

<template>
  <div>
    <h2 class="text-3xl md:text-4xl mb-3 pb-2">Speisekarte</h2>
    <UNavigationMenu
      variant="link"
      orientation="vertical"
      class="data-[orientation=vertical]:w-48"
      :items="navItems"
    />
  </div>
</template>
