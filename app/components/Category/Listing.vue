<script setup lang="ts">
import type { Schemas } from "#shopware";
import Breadcrumb from "~/components/Category/Breadcrumb.vue";
import MenuBonCard from "~/components/Menu/BonCard.vue";

// A menu category lists up to 100 products; hydrating every card up front
// costs ~1 s of main-thread time on phones (#314).
const MenuBonCardWhenVisible = hydrateWhenVisible(MenuBonCard);

// Menu of #441: word-list index, section title, bon cards with quick add.
const { menuView } = useThemePreset();

const props = defineProps<{
  id: string;
}>();

const { id: categoryId } = toRefs(props);

const { category } = await useCategoryById(categoryId);

const selectedPropertyFilters = useState<string[]>(
  "listing-property-filters",
  () => [],
);

const {
  showSkeleton,
  loading,
  elements,
  sortingOrders,
  currentSortingOrder,
  availableFilters,
  currentFilters,
  changeSorting,
  setFilters,
  resetFilters: resetListingFilters,
} = useCategoryListing(props.id, selectedPropertyFilters.value);

async function resetFilters() {
  selectedPropertyFilters.value = [];
  await resetListingFilters();
}

useCategorySeo(category);
useMenuSectionSchema(category, elements);

const quickView = useProductQuickView(elements);

// Derived from the listing data instead of snapshotted at setup time, which
// would be a hydration mismatch (#239); see useSortingSelection.
const { currentSorting } = useSortingSelection(currentSortingOrder);
const presetSortingOptions = computed(() =>
  toSortingOptions(sortingOrders.value),
);

const propertyFilters = computed<Schemas["PropertyGroup"][]>(
  () =>
    (availableFilters.value?.filter(
      (availableFilter) => availableFilter.code === "properties",
    ) ?? []) as unknown as Schemas["PropertyGroup"][],
);
const selectedPropertyFiltersString = computed(() =>
  selectedPropertyFilters.value?.join("|"),
);

const selectedListingFilters = computed<ShortcutFilterParam[]>(() => {
  return [
    {
      code: "properties",
      value: selectedPropertyFiltersString.value,
    },
  ];
});

// When the listing loads for a new category, drop any persisted filters whose
// option IDs don't exist in this category's available options.
watch(
  propertyFilters,
  (filters) => {
    if (selectedPropertyFilters.value.length === 0) return;

    const availableOptionIds = new Set(
      filters.flatMap((f) => f.options?.map((o) => o.id) ?? []),
    );
    const valid = selectedPropertyFilters.value.filter((id) =>
      availableOptionIds.has(id),
    );

    if (valid.length !== selectedPropertyFilters.value.length) {
      selectedPropertyFilters.value = valid;
    }
  },
  { once: true },
);

let filterChain = Promise.resolve();

watch(selectedListingFilters, (newFilters, oldFilters) => {
  if (newFilters[0]?.value === oldFilters?.[0]?.value) return;
  // setFilters doesn't send an order, so the response falls back to the
  // default sorting; drop the override so the select follows it (#249).
  currentSorting.value = SORTING_PLACEHOLDER;
  filterChain = filterChain
    .catch(() => {})
    .then(() => setFilters(newFilters))
    .catch(() => {});
});

watch(currentSorting, async (val) => {
  if (val === SORTING_PLACEHOLDER || val === currentSortingOrder.value) return;
  const sortingQuery = {
    query: currentFilters.value?.search,
    properties: currentFilters.value?.properties?.join("|"),
  };
  await changeSorting(val, sortingQuery);
});

const moreThanOneFilterAndOption = computed<boolean>(
  () => propertyFilters.value.length > 0,
);

// The filter sheet is created on first use; mounting it with the page
// forced a layout of the whole listing (#314).
const filterDrawerMounted = ref(false);
const filterDrawerOpen = ref(false);

async function openFilterDrawer() {
  if (!filterDrawerMounted.value) {
    filterDrawerMounted.value = true;
    await nextTick();
  }
  filterDrawerOpen.value = true;
}
</script>

<template>
  <div
    class="mx-auto grid w-full max-w-(--sb-container) gap-x-12 px-4 pt-4 pb-16 font-body text-sb-ink sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)_340px] lg:px-8 lg:pt-8"
  >
    <aside
      class="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"
    >
      <MenuCategoryIndex />
    </aside>

    <div class="min-w-0">
      <Breadcrumb :category-id="category?.id" />
      <MenuSectionHeader
        v-if="category"
        :category="category"
        :count="elements.length"
      />
      <MenuOrderMode class="mb-4 lg:hidden" />
      <CategorySearchInput class="mb-4" />
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SbSelect
          v-model="currentSorting"
          label="Sortierung"
          placeholder="Bitte wählen"
          :options="presetSortingOptions"
          class="max-w-72"
        />
        <template v-if="moreThanOneFilterAndOption">
          <!-- The right column holds the cart, so the filters live in a
               sheet on every screen size. -->
          <SbButton
            :variant="selectedPropertyFilters.length ? 'primary' : 'secondary'"
            aria-haspopup="dialog"
            @click="openFilterDrawer"
          >
            Filter
            <span v-if="selectedPropertyFilters.length" class="tabular-nums"
              >({{ selectedPropertyFilters.length }}
              <span class="sr-only">aktiv</span>)</span
            >
          </SbButton>
          <SbSheet
            v-if="filterDrawerMounted"
            v-model:open="filterDrawerOpen"
            title="Filter"
          >
            <div class="flex flex-col gap-4">
              <CategoryFilterGroup
                v-for="filter in propertyFilters"
                :key="filter.id"
                v-model="selectedPropertyFilters"
                :filter="filter"
              />
            </div>
            <template #footer>
              <div class="flex gap-3">
                <SbButton variant="secondary" block @click="resetFilters"
                  >Zurücksetzen</SbButton
                >
                <SbButton block @click="filterDrawerOpen = false"
                  >{{ elements.length }} Gerichte zeigen</SbButton
                >
              </div>
            </template>
          </SbSheet>
        </template>
      </div>

      <div
        v-if="showSkeleton"
        class="grid grid-cols-1 gap-3"
        aria-busy="true"
        aria-label="Gerichte werden geladen"
      >
        <LazyProductCardSkeleton v-for="i in 6" :key="i" />
      </div>
      <div
        v-else
        class="grid grid-cols-1 gap-3 transition-opacity duration-200"
        :class="{ 'pointer-events-none opacity-40': loading }"
      >
        <MenuBonCardWhenVisible
          v-for="product in elements"
          :key="product.id"
          :product="product"
          :photo="menuView === 'bonPhoto'"
          :href="productDeepLink(product, category?.seoUrl)"
          @select="quickView.show"
        />
      </div>
      <LazyProductQuickView
        v-if="quickView.mounted.value"
        v-model:open="quickView.open.value"
        :product="quickView.product.value"
      />
    </div>

    <aside
      class="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto"
    >
      <MenuCartPanel />
    </aside>
  </div>
</template>
