<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { loadNavigationElements, navigationElements } = useNavigation();

loadNavigationElements({ depth: 1 });

const navItems = computed<NavigationMenuItem[]>(() => {
  return navigationElements.value?.map((item: Schemas["Category"]) => {
    return {
      label: item.translated?.name,
      to: item.children.length === 0 ? item.seoUrl : undefined,
      children: item.children?.map((child: Schemas["Category"]) => {
        return {
          label: child.translated?.name,
          to: child.seoUrl,
        };
      }),
    };
  });
});
</script>

<template>
  <UNavigationMenu
    class="lg:hidden"
    orientation="horizontal"
    :items="navItems"
    :ui="{
      list: 'overflow-x-auto',
      item: 'flex-shrink-0',
    }"
  >
    <template #list-leading>
      <UIcon name="i-lucide-chevron-left" class="size-8" />
    </template>
    <template #list-trailing>
      <UIcon name="i-lucide-chevron-right" class="size-8" />
    </template>
  </UNavigationMenu>
</template>
