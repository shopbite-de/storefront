<script setup lang="ts">
import type { operations, Schemas } from "#shopware";
import Breadcrumb from "~/components/Category/Breadcrumb.vue";

const props = defineProps<{
  id: string;
}>();

const { id: categoryId } = toRefs(props);

const searchCriteria = {
  includes: {
    product: [
      "id",
      "productNumber",
      "name",
      "description",
      "calculatedPrice",
      "translated",
      "properties",
      "propertyIds",
      "sortedProperties",
      "cover",
    ],
    property: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "group"],
    product_option: ["id", "groupId", "name", "translated", "group"],
  },
  associations: {
    cover: {
      associations: {
        media: {},
      },
    },
    properties: {
      associations: {
        group: {},
      },
    },
  },
  limit: 100,
} as operations["searchPage post /search"]["body"];

const {
  resetFilters,
  loading,
  search,
  getElements,
  getCurrentListing,
  getCurrentSortingOrder,
  getSortingOrders,
  changeCurrentSortingOrder,
  getAvailableFilters,
  getCurrentFilters,
  setCurrentFilters,
  setInitialListing,
} = useListing({
  listingType: "categoryListing",
  categoryId: props.id,
  defaultSearchCriteria: searchCriteria,
});

const { category } = await useCategory(categoryId);

useCategorySeo(category);

const currentSorting = ref(getCurrentSortingOrder.value ?? "Sortieren");

const propertyFilters = computed<Schemas["PropertyGroup"][]>(
  () =>
    (getAvailableFilters.value?.filter(
      (availableFilter) => availableFilter.code === "properties",
    ) ?? []) as unknown as Schemas["PropertyGroup"][],
);

const selectedPropertyFilters = ref(getCurrentFilters.value?.properties ?? []);
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

const nuxtApp = useNuxtApp();
const { data: listingPayload, pending } = await useAsyncData(
  `listing${categoryId.value}`,
  async () => {
    await search(searchCriteria);
    // Return the result so it gets serialized into the SSR payload.
    // On the client, useAsyncData will restore this without re-running search().
    return getCurrentListing.value;
  },
);

// Populate useListing state from the SSR payload on the client.
// useListing uses plain refs (not useState), so its state is not automatically
// hydrated — we restore it via setInitialListing.
if (listingPayload.value) {
  await setInitialListing(listingPayload.value);
}

// During SSR hydration, pending may briefly be true before the payload cache is applied.
// Suppress the skeleton in that window to prevent a hydration mismatch.
const showSkeleton = computed(() => pending.value && !nuxtApp.isHydrating);

watch(selectedListingFilters, (newFilters, oldFilters) => {
  if (newFilters[0]?.value === oldFilters?.[0]?.value) {
    return;
  }
  setCurrentFilters(newFilters);
  currentSorting.value = "Sortieren";
});

watch(currentSorting, async () => {
  const sortingQuery = {
    query: getCurrentFilters.value?.search,
    properties: getCurrentFilters.value?.properties?.join("|"),
  };
  await changeCurrentSortingOrder(currentSorting.value as string, sortingQuery);
});

async function handleFilterRest() {
  await resetFilters();
}

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
            <UBadge
              variant="subtle"
              :label="`${getElements.length} Produkte`"
            />
            <USelect
              v-model="currentSorting"
              icon="i-lucide-arrow-down-wide-narrow"
              value-key="key"
              :items="getSortingOrders"
              placeholder="Sortierung"
            />
            <UDrawer
              v-if="moreThanOneFilterAndOption"
              class="lg:hidden"
              title="Filter"
              direction="right"
            >
              <UButton
                label="Filter"
                icon="i-lucide-sliders-horizontal"
                color="neutral"
                variant="subtle"
              />

              <template #body>
                <div class="flex flex-col gap-4">
                  <div
                    v-for="filter in propertyFilters"
                    :key="filter.id"
                    class="flex flex-col gap-4"
                  >
                    <UCollapsible
                      class="flex flex-col gap-2 w-48"
                      :default-open="true"
                    >
                      <UButton
                        :label="filter.translated.name"
                        color="neutral"
                        variant="subtle"
                        trailing-icon="i-lucide-chevron-down"
                        block
                        :ui="{
                          trailingIcon:
                            'group-data-[state=open]:rotate-180 transition-transform duration-200',
                        }"
                      />

                      <template #content>
                        <UCheckboxGroup
                          v-model="selectedPropertyFilters"
                          :items="filter.options"
                          value-key="id"
                          label-key="translated.name"
                        />
                      </template>
                    </UCollapsible>
                  </div>
                  <UButton
                    label="Zurücksetzten"
                    variant="outline"
                    block
                    @click="handleFilterRest"
                  />
                </div>
              </template>
            </UDrawer>
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
              v-for="product in getElements"
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
          <div v-if="moreThanOneFilterAndOption" class="flex flex-col gap-4">
            <h2 class="text-3xl md:text-4xl mb-3 pb-2">Filter</h2>
            <div
              v-for="filter in propertyFilters"
              :key="filter.id"
              class="flex flex-col gap-4"
            >
              <UCollapsible
                class="flex flex-col gap-2 w-48"
                :default-open="true"
              >
                <UButton
                  :label="filter.translated.name"
                  color="neutral"
                  variant="subtle"
                  trailing-icon="i-lucide-chevron-down"
                  block
                  :ui="{
                    trailingIcon:
                      'group-data-[state=open]:rotate-180 transition-transform duration-200',
                  }"
                />

                <template #content>
                  <UCheckboxGroup
                    v-model="selectedPropertyFilters"
                    :items="filter.options"
                    value-key="id"
                    label-key="translated.name"
                  />
                </template>
              </UCollapsible>
            </div>
            <UButton
              label="Zurücksetzten"
              variant="outline"
              block
              @click="handleFilterRest"
            />
          </div>
        </UPageAside>
      </template>
    </UPage>
  </UContainer>
</template>
