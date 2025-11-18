<script setup lang="ts">
import type { operations, Schemas } from "#shopware";

const props = defineProps<{
  id: string;
}>();

const { id: categoryId } = toRefs(props);

const query = {
  includes: {
    product: [
      "id",
      "productNumber",
      "name",
      "description",
      "calculatedPrice",
      "translated",
      "categories",
      "properties",
      "propertyIds",
      "options",
      "optionIds",
      "configuratorSettings",
      "children",
      "parentId",
      "sortedProperties",
      "cover",
      "parentId",
    ],
    property: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "group"],
    product_configurator_setting: ["id", "optionId", "option", "productId"],
    product_option: ["id", "groupId", "name", "translated", "group"],
  },
  associations: {
    cover: {
      associations: {
        media: {},
      },
    },
    categories: {},
    properties: {
      associations: {
        group: {},
      },
    },
    options: {
      associations: {
        group: {},
      },
    },
    configuratorSettings: {
      associations: {
        option: {
          associations: {
            group: {},
          },
        },
      },
    },
    children: {
      associations: {
        properties: {
          associations: {
            group: {},
          },
        },
        options: {
          associations: {
            group: {},
          },
        },
      },
    },
  },
} as operations["searchPage post /search"]["body"];

const {
  resetFilters,
  loading,
  search,
  getElements,
  getCurrentSortingOrder,
  getSortingOrders,
  changeCurrentSortingOrder,
  getAvailableFilters,
  getCurrentFilters,
  setCurrentFilters,
} = useListing({
  listingType: "categoryListing",
  categoryId: props.id,
  defaultSearchCriteria: query,
});

const { search: categorySearch } = useCategorySearch();

const { data: category } = await useAsyncData(
  `category${categoryId.value}`,
  async () => {
    return await categorySearch(categoryId.value);
  },
);

const pageTitle = computed(
  () =>
    `${category.value?.translated.name ?? category.value?.name} | Speisekarte`,
);

useSeoMeta({
  title: pageTitle,
  robots: "index,follow",
});

const currentSorting = ref(getCurrentSortingOrder.value ?? "Sortieren");

const propertyFilters = computed<Schemas["PropertyGroup"][]>(() =>
  getAvailableFilters.value?.filter(
    (availableFilter) => availableFilter.code === "properties",
  ),
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

await useAsyncData(`listing${categoryId.value}`, async () => {
  await search(query);
});

watch(selectedListingFilters, () => {
  setCurrentFilters(selectedListingFilters.value);
});

watch(currentSorting, () => {
  changeCurrentSortingOrder(currentSorting.value as string);
});

async function handleFilterRest() {
  await resetFilters();
  selectedPropertyFilters.value = [];
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
          <NavigationDesktopLeft2 />
        </UPageAside>
      </template>

      <UPageBody>
        <div>
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

          <Loading v-if="loading" text="Produkte werden geladen..." size="lg" />

          <div v-else class="flex flex-col gap-4">
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
            <h3>Filter</h3>
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
