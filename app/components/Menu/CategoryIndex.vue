<script setup lang="ts">
import type { NavigationNode } from "../../../shared/domain";
import { useNavigation } from "~/composables/useNavigation";

/**
 * Section index of the presets on desktop (#441): the menu sections as a
 * word list in the display font, sub-sections indented. The current
 * section is underlined in the accent colour (the text stays ink: no red
 * on controls) and marked `aria-current`.
 */
const { menuCardNavigation } = useNavigation(true);
const route = useRoute();

type Entry = { label: string; to: string; depth: number };

function flatten(nodes: readonly NavigationNode[], depth = 0): Entry[] {
  return nodes.flatMap((node) => [
    { label: node.label, to: node.path ?? "", depth },
    ...flatten(node.children, depth + 1),
  ]);
}

const entries = computed(() => flatten(menuCardNavigation.value ?? []));

function isCurrent(to: string) {
  const normalize = (path: string) => path.replace(/\/+$/, "").toLowerCase();
  return to !== "" && normalize(route.path) === normalize(to);
}
</script>

<template>
  <nav :aria-label="$t('menu.categoryIndex.label')" class="sticky top-6">
    <ul class="flex flex-col border-t-[1.5px] border-sb-ink">
      <li v-for="entry in entries" :key="entry.to">
        <NuxtLink
          :to="entry.to"
          :aria-current="isCurrent(entry.to) ? 'page' : undefined"
          :class="[
            'flex min-h-11 items-center border-b border-sb-line text-sb-ink hover:text-sb-primary-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-sb-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[7px]',
            entry.depth === 0
              ? 'font-display text-xl'
              : 'pl-4 font-body text-[15px]',
          ]"
        >
          {{ entry.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
