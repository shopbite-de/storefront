<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import type { Schemas } from "#shopware";

type Category = Schemas["Category"];

const props = withDefaults(
  defineProps<{
    shouldSkipFirstLevel?: boolean;
  }>(),
  {
    shouldSkipFirstLevel: false,
  },
);

const { loadNavigationElements, navigationElements } = useNavigation();

loadNavigationElements({ depth: 3 });

const navItems = computed<NavigationMenuItem[]>(() => {
  const elements = navigationElements.value ?? [];

  const mapCategoryRecursively = (category: Category): NavigationMenuItem => {
    const hasChildren = (category.children?.length ?? 0) > 0;

    return {
      label: category.translated?.name ?? "",
      to: hasChildren ? undefined : category.seoUrl,
      children: hasChildren
        ? category.children!.map(mapCategoryRecursively)
        : undefined,
    };
  };

  if (props.shouldSkipFirstLevel) {
    return elements
      .flatMap((item: Category) => item.children ?? [])
      .map(mapCategoryRecursively);
  }

  return elements.map(mapCategoryRecursively);
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
