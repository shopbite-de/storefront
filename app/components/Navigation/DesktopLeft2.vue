<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { loadNavigationElements } = useNavigation();

const { data: navigationElements } = await useAsyncData(
  `navigation`,
  async () => {
    return await loadNavigationElements({ depth: 2 });
  },
);

const navItems = computed<NavigationMenuItem[]>(() => {
  return navigationElements.value?.map((item: Schemas["Category"]) => {
    return {
      label: item.translated?.name,
      description: `${item.translated?.name} Kategorie`,
      to: item.seoUrl,
      defaultOpen: true,
      children: item.children?.map((child: Schemas["Category"]) => {
        return {
          label: child.translated?.name,
          description: `${child.translated?.name} Kategorie`,
          to: child.seoUrl,
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
      variant="link"
      orientation="vertical"
      class="data-[orientation=vertical]:w-48"
      :items="navItems"
    />
  </div>
</template>
