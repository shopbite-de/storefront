<script setup lang="ts">
import { shopLocale } from "#shopbite-locale";
/**
 * "Oft bestellt" of the presets (#444): the top sellers as bon cards with
 * quick add, a tap on the name opens the quick view. Renders nothing
 * without top sellers.
 */
const props = defineProps<{
  title?: string;
}>();
const { t } = useI18n();
// the content's title, else the default heading (#388)
const heading = computed(() => props.title ?? t("common.homeHighlights.title"));

const { loadTopSellers } = useTopSellers();
const { data: topSellers } = await useAsyncData("top-sellers", () =>
  loadTopSellers(),
);

const dishes = computed(() => topSellers.value ?? []);
const quickView = useProductQuickView(dishes);
const { menuView } = useThemePreset();
</script>

<template>
  <section
    v-if="dishes.length"
    id="highlights"
    aria-labelledby="home-highlights-title"
    class="mx-auto w-full max-w-(--sb-container) px-4 py-14 sm:px-6 lg:px-8 sm:py-24"
  >
    <div class="mb-7 flex items-baseline justify-between gap-5">
      <h2
        id="home-highlights-title"
        class="font-display text-[32px] leading-tight text-sb-ink sm:text-5xl"
      >
        {{ heading }}
      </h2>
      <NuxtLink
        :to="shopLocale.menuPath"
        class="inline-flex min-h-11 items-center font-body font-bold text-sb-primary-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-sb-focus"
      >
        {{ $t("common.shared.toMenu") }}
      </NuxtLink>
    </div>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      <MenuBonCard
        v-for="dish in dishes"
        :key="dish.id"
        :dish="dish"
        :photo="menuView === 'bonPhoto'"
        :href="dishLink(dish)"
        @select="quickView.show"
      />
    </div>
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :dish="quickView.dish.value"
    />
  </section>
</template>
