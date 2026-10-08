<script setup lang="ts">
import { useNavigation } from "~/composables/useNavigation";

/**
 * Menu categories as a horizontally scrolling row on phones and tablets
 * (#445); the desktop menu has the word-list index (MenuCategoryIndex).
 */
const { menuCardMenu } = useNavigation(true);
const route = useRoute();

const isCurrent = (to?: string) =>
  !!to && decodeURI(route.path).toLowerCase() === decodeURI(to).toLowerCase();
</script>

<template>
  <nav
    v-if="menuCardMenu.length"
    aria-label="Kategorien der Speisekarte"
    class="border-b border-sb-line bg-sb-bg/95 font-body backdrop-blur-sm"
  >
    <ul class="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6">
      <li v-for="item in menuCardMenu" :key="item.to ?? item.label">
        <NuxtLink
          :to="item.to"
          :aria-current="isCurrent(item.to) ? 'page' : undefined"
          class="flex min-h-11 items-center rounded-sb-control px-3.5 font-semibold whitespace-nowrap text-sb-ink hover:bg-sb-muted focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sb-focus aria-[current=page]:bg-sb-ink aria-[current=page]:text-sb-bg"
          >{{ item.label }}</NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>
