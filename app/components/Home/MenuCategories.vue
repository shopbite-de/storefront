<script setup lang="ts">
import type { Schemas } from "#shopware";

// Tiles of the menu sections directly below the hero (#388): the children
// of the menu root (`menuCategoryId`, else the navigation root) with the
// category photo from Shopware (`category.media`) or, without one, the
// section icon on the brand colour. Every tile links to its listing.
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    headline?: string;
    /** Tiles shown before the "all sections" tile. */
    limit?: number;
  }>(),
  {
    title: "Unsere Speisekarte",
    description: undefined,
    headline: undefined,
    limit: 8,
  },
);

const { apiClient } = useShopwareContext();
const config = useRuntimeConfig();
const rootId = config.public.shopBite.menuCategoryId || "main-navigation";

const { data: categories } = await useAsyncData(
  "home-menu-categories",
  async () => {
    const response = await apiClient.invoke(
      "readNavigation post /navigation/{activeId}/{rootId}",
      {
        body: {
          depth: 1,
          // Sent as a POST body so the projection is honoured (#312).
          includes: {
            category: [
              "id",
              "name",
              "translated",
              "seoUrl",
              "customFields",
              "media",
            ],
            media: ["url", "thumbnails", "metaData"],
            media_thumbnail: ["url", "width"],
          },
        },
        pathParams: { activeId: "main-navigation", rootId },
      },
    );
    return response.data;
  },
);

const tiles = computed(() =>
  (categories.value ?? []).filter((category) => category.seoUrl),
);
const visible = computed(() => tiles.value.slice(0, props.limit));
const hasMore = computed(() => tiles.value.length > props.limit);

function name(category: Schemas["Category"]) {
  return category.translated?.name ?? category.name;
}

function icon(category: Schemas["Category"]) {
  return (
    (category.customFields as Record<string, string> | null)
      ?.shopbite_category_icon ?? "i-lucide-utensils"
  );
}
</script>

<template>
  <UPageSection
    v-if="tiles.length > 0"
    id="speisekarte"
    :title="title"
    :description="description"
    :headline="headline"
    :ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
  >
    <ul
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      data-testid="menu-categories"
    >
      <li v-for="category in visible" :key="category.id">
        <NuxtLink
          :to="category.seoUrl"
          class="group relative isolate flex aspect-[4/3] overflow-hidden rounded-xl bg-neutral-950 ring ring-default transition-shadow hover:shadow-lg hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <img
            v-if="category.media?.url"
            :src="category.media.url"
            :srcset="mediaSrcSet(category.media)"
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
            :width="mediaSize(category.media)?.width"
            :height="mediaSize(category.media)?.height"
            alt=""
            loading="lazy"
            decoding="async"
            class="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            v-else
            class="absolute inset-0 -z-20 flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-800 text-white/80"
            aria-hidden="true"
          >
            <UIcon :name="icon(category)" class="size-12 sm:size-16" />
          </div>
          <div
            class="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-950/85 via-neutral-950/30 to-transparent"
            aria-hidden="true"
          />
          <span
            class="mt-auto flex w-full items-center justify-between gap-2 p-3 text-white sm:p-4"
          >
            <span class="flex min-w-0 items-center gap-2">
              <UIcon
                v-if="category.media?.url"
                :name="icon(category)"
                class="size-4 shrink-0 text-white/80"
              />
              <span class="truncate text-base font-bold sm:text-lg">
                {{ name(category) }}
              </span>
            </span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </NuxtLink>
      </li>
      <li v-if="hasMore">
        <NuxtLink
          to="/speisekarte/"
          class="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl bg-elevated text-primary ring ring-default transition-shadow hover:shadow-lg hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <UIcon name="i-lucide-layout-grid" class="size-8" />
          <span class="font-bold">Alle Kategorien</span>
          <span class="text-sm text-muted">{{ tiles.length }} Bereiche</span>
        </NuxtLink>
      </li>
    </ul>
  </UPageSection>
</template>
