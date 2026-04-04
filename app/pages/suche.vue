<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { NitroFetchRequest } from "nitropack";

definePageMeta({
  layout: "listing",
});

const route = useRoute();
const router = useRouter();
const { searchFallbackCategoryId } = useRuntimeConfig().public.shopBite;

const searchQuery = computed(() => String(route.query.q ?? "").trim());

const {
  showSkeleton,
  loading,
  elements,
  sortingOrders,
  currentSortingOrder,
  applySearch,
  changeSorting,
} = useListingSearch(searchQuery.value);

const { trackSearch } = useTrackEvent();

// Re-fetch when the URL query changes (e.g. user searches again from this page)
watch(searchQuery, (q) => applySearch(q));

// Fire a Matomo event whenever results settle for a given search term
watch(elements, (products) => {
  if (!searchQuery.value || showSkeleton.value) return;
  trackSearch(
    searchQuery.value,
    products.map((p) => p.productNumber),
  );
});

// Fallback: fetch a curated category listing when search returns no results.
// The category should have a dynamic product group assigned in Shopware.
const showFallback = computed(
  () =>
    !showSkeleton.value &&
    !loading.value &&
    elements.value.length === 0 &&
    !!searchFallbackCategoryId,
);

const { data: fallbackProducts, refresh: refreshFallback } = useLazyAsyncData<
  Schemas["Product"][]
>(
  "search-fallback-listing",
  async () => {
    const result = await $fetch(
      `/api/listing/${searchFallbackCategoryId}` as NitroFetchRequest,
    );
    return (result as { elements?: Schemas["Product"][] }).elements ?? [];
  },
  { immediate: false },
);

watch(showFallback, (visible) => {
  if (visible && !fallbackProducts.value) {
    refreshFallback();
  }
});

const currentSorting = ref(currentSortingOrder.value ?? "Sortieren");

watch(currentSortingOrder, (val) => {
  if (val) currentSorting.value = val;
});

watch(currentSorting, async (val) => {
  if (val === currentSortingOrder.value) return;
  await changeSorting(val, searchQuery.value);
});

const searchInput = ref(searchQuery.value);

function submitSearch() {
  const term = searchInput.value.trim();
  if (!term) return;
  router.push({ path: "/suche", query: { q: term } });
}
</script>

<template>
  <UContainer>
    <UPage>
      <UPageBody>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <UInput
              v-model="searchInput"
              name="search"
              class="flex-1"
              size="md"
              icon="i-lucide-search"
              placeholder="Produkte suchen..."
              @keyup.enter="submitSearch"
            >
              <template v-if="searchInput" #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-circle-x"
                  aria-label="Suche leeren"
                  @click="searchInput = ''"
                />
              </template>
            </UInput>
            <USelect
              v-model="currentSorting"
              icon="i-lucide-arrow-down-wide-narrow"
              value-key="key"
              :items="sortingOrders"
              placeholder="Sortierung"
            />
          </div>

          <div
            v-if="searchQuery && !showSkeleton"
            class="flex items-center gap-2"
          >
            <p class="text-sm text-muted">
              Suchergebnisse für „{{ searchQuery }}"
            </p>
            <UBadge variant="subtle" :label="`${elements.length} Produkte`" />
          </div>

          <div
            v-if="showSkeleton"
            class="flex flex-col gap-4"
            aria-busy="true"
            aria-label="Produkte werden geladen"
          >
            <LazyProductCardSkeleton v-for="i in 6" :key="i" />
          </div>

          <div
            v-else-if="elements.length > 0"
            class="flex flex-col gap-4 transition-opacity duration-200"
            :class="{ 'opacity-40 pointer-events-none': loading }"
          >
            <ProductCard
              v-for="product in elements"
              :key="product.id"
              :product="product"
              :with-favorite-button="true"
              :with-add-to-cart-button="true"
            />
          </div>

          <template v-else-if="searchQuery && !showSkeleton && !loading">
            <p class="text-muted">
              Keine Produkte für „{{ searchQuery }}" gefunden.
            </p>
            <template v-if="showFallback && fallbackProducts?.length">
              <p class="text-sm font-medium mt-2">Das könnte dir gefallen:</p>
              <div class="flex flex-col gap-4">
                <ProductCard
                  v-for="product in fallbackProducts"
                  :key="product.id"
                  :product="product"
                  :with-favorite-button="true"
                  :with-add-to-cart-button="true"
                />
              </div>
            </template>
          </template>
        </div>
      </UPageBody>
    </UPage>
  </UContainer>
</template>
