<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

const { loadNavigationElements, navigationElements } = useNavigation();

loadNavigationElements({ depth: 1 });

const scrollToElement = (elementId: string, margin = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition =
      element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - margin;
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }
};

const navItems = computed<NavigationMenuItem[][]>(() => {
  return navigationElements.value.map((item: Schemas["Category"]) => {
    return {
      label: item.translated?.name,
      onSelect: () => scrollToElement(item.name ?? "#", 90),
      children: item.children?.map((child: Schemas["Category"]) => {
        return {
          label: child.translated?.name,
          onSelect: () => scrollToElement(child.name ?? "#", 90),
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
