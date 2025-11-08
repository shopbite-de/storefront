<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { loadNavigationElements, navigationElements } = useNavigation();

loadNavigationElements({ depth: 2 });

const navItems = computed<NavigationMenuItem[][]>(() => {
  return navigationElements.value?.map((item: Schemas["Category"]) => {
    return {
      label: item.translated?.name,
      to: item.seoUrl,
      children: item.children?.map((child: Schemas["Category"]) => {
        return {
          label: child.translated?.name,
          to: item.seoUrl,
        };
      }),
    };
  });
});
</script>

<template>
  <div>
    <h2>Navigation</h2>
    <UNavigationMenu
      orientation="vertical"
      :items="navItems"
      class="data-[orientation=vertical]"
    />
  </div>
</template>
