<script setup lang="ts">
import type { Schemas } from "#shopware";

/**
 * Menu sections of the presets on the home page (#444): a word list in the
 * display font on the darker band, no dish counts. On desktop one photo
 * follows the hovered or focused section (category media from Shopware);
 * phones get the words stacked and no photo.
 */
withDefaults(
  defineProps<{
    title?: string;
  }>(),
  { title: "Speisekarte" },
);

const { categories } = await useHomeMenuCategories();

const sections = computed(() =>
  (categories.value ?? []).filter((category) => category.seoUrl),
);

const activeId = ref<string | null>(null);
const active = computed<Schemas["Category"] | undefined>(
  () =>
    sections.value.find((category) => category.id === activeId.value) ??
    sections.value.find((category) => category.media?.url),
);

function name(category: Schemas["Category"]) {
  return category.translated?.name ?? category.name;
}
</script>

<template>
  <section
    v-if="sections.length"
    id="speisekarte"
    aria-labelledby="home-menu-title"
    class="bg-sb-muted"
  >
    <div
      :class="[
        'mx-auto grid w-full max-w-(--sb-container) items-center gap-10 px-4 py-14 sm:px-6 lg:px-8 sm:py-24 lg:gap-[72px]',
        active?.media?.url
          ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'
          : '',
      ]"
    >
      <div class="flex flex-col gap-7 font-body text-sb-ink">
        <div class="flex items-center gap-3.5">
          <h2
            id="home-menu-title"
            class="font-body text-xs font-bold tracking-[0.14em] text-sb-accent uppercase"
          >
            {{ title }}
          </h2>
          <span class="h-[1.5px] w-16 bg-sb-control" aria-hidden="true" />
        </div>
        <ul
          class="flex flex-col border-t-[1.5px] border-sb-ink lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-5 lg:border-0"
        >
          <li
            v-for="(category, index) in sections"
            :key="category.id"
            class="lg:flex lg:items-baseline lg:gap-5"
          >
            <NuxtLink
              :to="category.seoUrl ?? ''"
              class="flex min-h-14 items-center justify-between border-b border-sb-line font-display text-[32px] leading-tight text-sb-ink hover:underline hover:decoration-sb-accent hover:decoration-[3px] hover:underline-offset-8 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sb-focus lg:min-h-0 lg:border-0 lg:text-[56px]"
              @mouseenter="activeId = category.id"
              @focus="activeId = category.id"
            >
              {{ name(category) }}
              <SbIcon
                name="chevron-right"
                class="text-sb-ink-muted lg:hidden"
              />
            </NuxtLink>
            <span
              v-if="index < sections.length - 1"
              class="hidden font-display text-[44px] text-sb-control lg:inline"
              aria-hidden="true"
              >·</span
            >
          </li>
        </ul>
        <NuxtLink
          to="/speisekarte/"
          class="inline-flex min-h-11 items-center gap-2 self-start font-bold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
        >
          Ganze Speisekarte öffnen
          <SbIcon name="chevron-right" />
        </NuxtLink>
      </div>
      <figure
        v-if="active?.media?.url"
        class="m-0 hidden flex-col gap-3 lg:flex"
        aria-hidden="true"
      >
        <img
          :src="active.media.url"
          :srcset="mediaSrcSet(active.media)"
          sizes="400px"
          alt=""
          loading="lazy"
          decoding="async"
          class="aspect-[4/5] w-full rounded-[20px] object-cover"
        />
        <figcaption class="font-body text-sm font-bold text-sb-ink">
          {{ name(active) }}
        </figcaption>
      </figure>
    </div>
  </section>
</template>
