<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useNavigation } from "~/composables/useNavigation";

/**
 * Menu categories as horizontally scrolling rows on phones and tablets
 * (#445); the desktop menu has the word-list index (MenuCategoryIndex).
 * The first row holds the menu sections. When the open section has
 * sub-categories (La Fattoria: Fleischgerichte → Vom Rind, Hähnchen …),
 * a second row lists them, led by "Alle" for the section itself; deeper
 * levels follow in the same row. The current chip scrolls into view.
 */
const { menuCardNavigation } = useNavigation(true);
const route = useRoute();

type Chip = { label: string; to: string };

const normalize = (path: string) =>
  decodeURI(path).replace(/\/+$/, "").toLowerCase();

const isCurrent = (to?: string) =>
  !!to && normalize(route.path) === normalize(to);

function toChip(category: Schemas["Category"]): Chip {
  return {
    label: category.translated?.name ?? category.name ?? "",
    to: category.seoUrl ?? "",
  };
}

function descendants(category: Schemas["Category"]): Schemas["Category"][] {
  return (category.children ?? []).flatMap((child) => [
    child,
    ...descendants(child),
  ]);
}

const sections = computed(() => menuCardNavigation.value ?? []);

// The section the current page belongs to: itself or one of its children.
const activeSection = computed(() =>
  sections.value.find(
    (section) =>
      isCurrent(section.seoUrl ?? undefined) ||
      descendants(section).some((child) =>
        isCurrent(child.seoUrl ?? undefined),
      ),
  ),
);

const subChips = computed<Chip[]>(() => {
  const section = activeSection.value;
  if (!section) return [];
  const children = descendants(section).map(toChip);
  if (!children.length) return [];
  return [{ label: "Alle", to: section.seoUrl ?? "" }, ...children];
});

const nav = ref<HTMLElement | null>(null);

// Long rows scroll sideways: bring the current chips into view.
function revealCurrent() {
  nav.value
    ?.querySelectorAll<HTMLElement>('[aria-current="page"], [data-section]')
    .forEach((chip) =>
      chip.scrollIntoView({ block: "nearest", inline: "center" }),
    );
}

onMounted(revealCurrent);
watch(
  () => route.path,
  () => nextTick(revealCurrent),
);

const chipClass =
  "flex min-h-11 items-center rounded-sb-control px-3.5 font-semibold whitespace-nowrap focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-sb-focus";
</script>

<template>
  <nav
    v-if="sections.length"
    ref="nav"
    aria-label="Kategorien der Speisekarte"
    class="border-b border-sb-line bg-sb-bg/95 font-body backdrop-blur-sm"
  >
    <ul class="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6">
      <li v-for="section in sections" :key="section.id">
        <NuxtLink
          :to="section.seoUrl ?? ''"
          :aria-current="isCurrent(section.seoUrl ?? '') ? 'page' : undefined"
          :data-section="section === activeSection ? '' : undefined"
          :class="[
            chipClass,
            section === activeSection
              ? 'bg-sb-ink text-sb-bg'
              : 'text-sb-ink hover:bg-sb-muted',
          ]"
          >{{ toChip(section).label }}</NuxtLink
        >
      </li>
    </ul>
    <ul
      v-if="subChips.length"
      :aria-label="`Unterkategorien von ${toChip(activeSection!).label}`"
      class="flex gap-1 overflow-x-auto border-t border-sb-line px-4 py-2 text-[15px] sm:px-6"
    >
      <li v-for="chip in subChips" :key="chip.to">
        <NuxtLink
          :to="chip.to"
          :aria-current="isCurrent(chip.to) ? 'page' : undefined"
          :class="[
            chipClass,
            'border border-sb-line text-sb-ink hover:bg-sb-muted aria-[current=page]:border-sb-ink aria-[current=page]:bg-sb-muted',
          ]"
          >{{ chip.label }}</NuxtLink
        >
      </li>
    </ul>
  </nav>
</template>
