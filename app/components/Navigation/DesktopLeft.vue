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
  <div>
    <h2>Navigation</h2>
    <UNavigationMenu
      orientation="vertical"
      :items="navItems"
      class="data-[orientation=vertical]"
    />
  </div>
</template>
