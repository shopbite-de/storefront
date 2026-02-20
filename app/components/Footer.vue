<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";
import type { Schemas } from "#shopware";
import type { NavigationMenuItem } from "@nuxt/ui";

const { footerNavigation } = useNavigation();

const mapCategoryToNavItem = (
  category: Schemas["Category"],
): NavigationMenuItem => {
  const label = category.translated?.name ?? "";

  return {
    label,
    description: `${label} Kategorie`,
    to: category.seoUrl,
    defaultOpen: true,
    icon: category.customFields?.shopbite_category_icon,
    children: (category.children ?? []).map(mapCategoryToNavItem),
  };
};

const navItems = computed<NavigationMenuItem[]>(() => {
  return (footerNavigation.value ?? []).map(mapCategoryToNavItem);
});
</script>

<template>
  <USeparator class="h-px" />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="navItems" />
      </UContainer>
    </template>

    <template #left>
      <NuxtLink
        to="https://shopbite.de"
        class="text-sm text-muted"
        target="_blank"
      >
        Bestellsystm von ShopBite • © {{ new Date().getFullYear() }}
      </NuxtLink>
    </template>

    <p class="text-muted text-sm">
      Alle Preise inkl. gesetzlicher Mehrwertsteuer zzgl. Versandkosten, wenn
      nicht anders beschrieben
    </p>

    <template #right>
      <UColorModeButton />

      <UButton
        to="https://github.com/shopbite-de/storefront"
        target="_blank"
        icon="i-simple-icons-github"
        aria-label="ShopBite on GitHub"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
