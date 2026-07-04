<script setup lang="ts">
import type { Schemas } from "#shopware";
import Breadcrumb from "~/components/Category/Breadcrumb.vue";

const props = defineProps<{
  id: string;
}>();

const { id: categoryId } = toRefs(props);

const { category } = await useCategory(categoryId);

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

// Derived from the listing data instead of snapshotted at setup time: on the
// server the listing resolves after setup, so a snapshot would render
// "Sortieren" while client hydration (payload already present) would render
// the actual sorting label — a hydration mismatch (#239).
// The placeholder is never stored as an override, so the select keeps
// following the listing data until the user explicitly picks a sorting.
const SORTING_PLACEHOLDER = "Sortieren";
const sortingOverride = ref<string | null>(null);
const currentSorting = computed<string>({
  get: () =>
    sortingOverride.value ?? currentSortingOrder.value ?? SORTING_PLACEHOLDER,
  set: (val) => {
    sortingOverride.value = val === SORTING_PLACEHOLDER ? null : val;
  },
});

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
</script>

<template>
  <UContainer>
    <UPage>
      <template #left>
        <UPageAside>
          <NavigationDesktopLeft />
        </UPageAside>
      </template>

      <UPageBody>
        <div>
          <Breadcrumb :category-id="category?.id" />
          <CategoryHeader v-if="category" :category="category" />
          <CategorySearchInput class="mb-4 grow flex" />
          <div class="flex flex-row justify-between gap-4 mb-4">
            <UBadge variant="subtle" :label="`${elements.length} Produkte`" />
            <USelect
              v-model="currentSorting"
              icon="i-lucide-arrow-down-wide-narrow"
              value-key="key"
              :items="sortingOrders"
              placeholder="Sortierung"
            />
            <ClientOnly v-if="moreThanOneFilterAndOption">
              <UDrawer class="lg:hidden" title="Filter" direction="right">
                <UButton
                  icon="i-lucide-sliders-horizontal"
                  :color="
                    selectedPropertyFilters.length ? 'primary' : 'neutral'
                  "
                  :variant="selectedPropertyFilters.length ? 'solid' : 'subtle'"
                >
                  Filter
                  <UBadge
                    v-if="selectedPropertyFilters.length"
                    :label="String(selectedPropertyFilters.length)"
                    size="sm"
                    color="neutral"
                    variant="solid"
                    class="ml-1"
                  />
                </UButton>

                <template #body>
                  <div class="flex flex-col gap-4">
                    <CategoryFilterGroup
                      v-for="filter in propertyFilters"
                      :key="filter.id"
                      v-model="selectedPropertyFilters"
                      :filter="filter"
                    />
                    <UButton
                      label="Zurücksetzen"
                      variant="outline"
                      block
                      @click="resetFilters"
                    />
                  </div>
                </template>
              </UDrawer>
              <template #fallback>
                <USkeleton class="h-8 w-20 lg:hidden" />
              </template>
            </ClientOnly>
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
            v-else
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
        </div>
      </UPageBody>

      <template #right>
        <UPageAside>
          <ClientOnly v-if="moreThanOneFilterAndOption">
            <div class="flex flex-col gap-4">
              <h2 class="text-3xl md:text-4xl mb-3 pb-2">Filter</h2>
              <CategoryFilterGroup
                v-for="filter in propertyFilters"
                :key="filter.id"
                v-model="selectedPropertyFilters"
                :filter="filter"
              />
              <UButton
                label="Zurücksetzen"
                variant="outline"
                block
                @click="resetFilters"
              />
            </div>
            <template #fallback>
              <div class="flex flex-col gap-4">
                <USkeleton class="h-9 w-20" />
                <div class="flex flex-col gap-2">
                  <USkeleton class="h-8 w-48" />
                  <USkeleton class="h-4 w-36" />
                  <USkeleton class="h-4 w-32" />
                  <USkeleton class="h-4 w-40" />
                </div>
                <div class="flex flex-col gap-2">
                  <USkeleton class="h-8 w-48" />
                  <USkeleton class="h-4 w-36" />
                  <USkeleton class="h-4 w-32" />
                </div>
              </div>
            </template>
          </ClientOnly>
        </UPageAside>
      </template>
    </UPage>
  </UContainer>
</template>
