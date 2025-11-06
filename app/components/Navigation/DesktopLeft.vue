<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";
import { useTrackEvent } from "#imports";

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
    useTrackEvent("scroll_to_category", {
      props: { category_name: elementId },
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

<style scoped>
@import "tailwindcss";
@import "@nuxt/ui";

h1 {
  @apply text-3xl sm:text-4xl lg:text-5xl text-pretty tracking-tight font-bold text-highlighted my-14;
}

h2 {
  @apply mt-0 text-2xl sm:text-3xl lg:text-4xl text-pretty tracking-tight font-bold text-highlighted my-10;
}
</style>
