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

const currentSorting = ref(currentSortingOrder.value ?? "Sortieren");

// Sync currentSorting when listing data arrives during client-side navigation
// (currentSortingOrder.value is null at setup time in that case).
watch(
  currentSortingOrder,
  (val) => {
    if (val) currentSorting.value = val;
  },
  { once: true },
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
  currentSorting.value = "Sortieren";
  filterChain = filterChain
    .catch(() => {})
    .then(() => setFilters(newFilters))
    .catch(() => {});
});

watch(currentSorting, async (val) => {
  if (val === currentSortingOrder.value) return;
  const sortingQuery = {
    query: currentFilters.value?.search,
    properties: currentFilters.value?.properties?.join("|"),
  };
  await changeSorting(val as string, sortingQuery);
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
                  label="Filter"
                  icon="i-lucide-sliders-horizontal"
                  color="neutral"
                  variant="subtle"
                />

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
