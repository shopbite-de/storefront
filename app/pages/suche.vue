<script setup lang="ts">
import type { NitroFetchRequest } from "nitropack";
import type { Dish, MenuListing } from "../../shared/domain";
import MenuBonCard from "~/components/Menu/BonCard.vue";

// Cards hydrate as they scroll into view, see Category/Listing.vue (#314).
const MenuBonCardWhenVisible = hydrateWhenVisible(MenuBonCard);

definePageMeta({
  layout: "listing",
});

useSeoMeta({
  title: "Suche",
});

const route = useRoute();
const router = useRouter();
const { searchFallbackCategoryId } = useRuntimeConfig().public.shopBite;

const searchQuery = computed(() => String(route.query.q ?? "").trim());

const {
  showSkeleton,
  loading,
  dishes,
  sortings,
  currentSorting: currentSortingOrder,
  applySearch,
  changeSorting,
} = useListingSearch(searchQuery.value);

// Derived from the listing data instead of snapshotted at setup time, which
// rendered the placeholder on the server and the actual sorting on the
// client: a hydration mismatch (#295, same as #239 in Category/Listing.vue).
const { currentSorting } = useSortingSelection(currentSortingOrder);

// Re-fetch when the URL query changes (e.g. user searches again from this
// page). applySearch sends no order, so the response falls back to the
// default sorting; drop the override so the select follows it.
watch(searchQuery, (q) => {
  currentSorting.value = SORTING_PLACEHOLDER;
  return applySearch(q);
});

useSearchTracking(searchQuery, dishes, showSkeleton);

// Fallback: fetch a curated category listing when search returns no results.
// The category should have a dynamic product group assigned in Shopware.
const showFallback = computed(
  () =>
    !showSkeleton.value &&
    !loading.value &&
    dishes.value.length === 0 &&
    !!searchFallbackCategoryId,
);

const { data: fallbackDishes, refresh: refreshFallback } = useLazyAsyncData<
  readonly Dish[]
>(
  "search-fallback-listing",
  async () => {
    const result = await $fetch<MenuListing>(
      `/api/listing/${searchFallbackCategoryId}` as NitroFetchRequest,
    );
    return result.dishes;
  },
  { immediate: false },
);

// One dish sheet for the results and the fallback suggestions (#325).
const quickView = useProductQuickView(() => [
  ...dishes.value,
  ...(fallbackDishes.value ?? []),
]);

watch(showFallback, (visible) => {
  if (visible && !fallbackDishes.value) {
    refreshFallback();
  }
});

watch(currentSorting, async (val) => {
  if (val === SORTING_PLACEHOLDER || val === currentSortingOrder.value) return;
  await changeSorting(val, searchQuery.value);
});

const searchInput = ref(searchQuery.value);

// Presets (#445): bon cards, a labelled search form and a native select.
const { menuView } = useThemePreset();
const sortingOptions = computed(() => toSortingOptions(sortings.value));
const resultLabel = computed(() =>
  dishes.value.length === 1
    ? "1 Gericht gefunden"
    : `${dishes.value.length} Gerichte gefunden`,
);

function submitSearch() {
  const term = searchInput.value.trim();
  if (!term) return;
  router.push({ path: "/suche", query: { q: term } });
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-(--sb-container) flex-col gap-6 px-4 pt-8 pb-16 font-body text-sb-ink sm:px-6 sm:pt-12 lg:px-8"
  >
    <LazyProductQuickView
      v-if="quickView.mounted.value"
      v-model:open="quickView.open.value"
      :dish="quickView.dish.value"
    />
    <h1 class="font-display text-4xl leading-tight sm:text-5xl">Suche</h1>
    <form
      role="search"
      class="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end"
      @submit.prevent="submitSearch"
    >
      <SbField
        v-slot="{ id, describedBy }"
        label="Gericht oder Zutat"
        class="flex-1"
      >
        <SbInput
          :id="id"
          v-model="searchInput"
          name="search"
          type="search"
          enterkeyhint="search"
          :aria-describedby="describedBy"
        />
      </SbField>
      <SbButton type="submit" size="lg">
        <SbIcon name="search" />
        Suchen
      </SbButton>
    </form>

    <div
      v-if="searchQuery"
      class="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p role="status" class="text-sb-ink-muted">
        <template v-if="showSkeleton || loading">Suche läuft …</template>
        <template v-else>{{ resultLabel }} für „{{ searchQuery }}“</template>
      </p>
      <SbSelect
        v-if="sortingOptions.length > 1 && dishes.length > 1"
        v-model="currentSorting"
        label="Sortierung"
        placeholder="Bitte wählen"
        :options="sortingOptions"
        class="sm:w-72"
      />
    </div>

    <div
      v-if="dishes.length > 0"
      class="grid max-w-3xl grid-cols-1 gap-3"
      :class="{ 'pointer-events-none opacity-40': loading }"
    >
      <MenuBonCardWhenVisible
        v-for="dish in dishes"
        :key="dish.id"
        :dish="dish"
        :photo="menuView === 'bonPhoto'"
        :href="dishLink(dish)"
        @select="quickView.show"
      />
    </div>
    <template v-else-if="searchQuery && !showSkeleton && !loading">
      <template v-if="showFallback && fallbackDishes?.length">
        <h2 class="font-display text-2xl">Vielleicht schmeckt Ihnen das</h2>
        <div class="grid max-w-3xl grid-cols-1 gap-3">
          <MenuBonCardWhenVisible
            v-for="dish in fallbackDishes"
            :key="dish.id"
            :dish="dish"
            :photo="menuView === 'bonPhoto'"
            :href="dishLink(dish)"
            @select="quickView.show"
          />
        </div>
      </template>
      <SbButton v-else variant="secondary" to="/" class="self-start"
        >Zur Startseite</SbButton
      >
    </template>
  </div>
</template>
