<script setup lang="ts">
import type { Schemas } from "#shopware";

const props = defineProps<{
  id: string;
}>();

const { id: categoryId } = toRefs(props);

const {
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
});

const { search: categorySearch } = useCategorySearch();

const { data: category } = await useAsyncData(
  `category${categoryId.value}`,
  async () => {
    return await categorySearch(categoryId.value);
  },
);

const currentSorting = ref(getCurrentSortingOrder.value);

const propertyFilters = computed<Schemas["PropertyGroup"][]>(() =>
  getAvailableFilters.value?.filter(
    (availableFilter) => availableFilter.code === "properties",
  ),
);

const selectedPropertyFilters = ref(getCurrentFilters.value?.properties ?? []);

const selectedListingFilters = computed<ShortcutFilterParam[]>(() => {
  return [
    {
      code: "properties",
      value: selectedPropertyFilters.value?.join("|"),
    },
  ];
});

search({
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
    ],
    property: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "group"],
    product_configurator_setting: ["id", "optionId", "option", "productId"],
    product_option: ["id", "groupId", "name", "translated", "group"],
  },
  sort: [
    {
      field: "productNumber",
      order: "ASC",
    },
  ],
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
});

watch(currentSorting, () => {
  changeCurrentSortingOrder(currentSorting.value as string);
});

watch(selectedListingFilters, () => {
  setCurrentFilters(selectedListingFilters.value);
});
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
              v-if="propertyFilters.length > 0"
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
              </template>
            </UDrawer>
          </div>

          <div v-if="loading === false" class="flex flex-col gap-4">
            <ProductCard
              v-for="product in getElements"
              :key="product.id"
              :product="product"
              :with-favorite-button="true"
              :with-add-to-cart-button="true"
            />
          </div>
          <div v-else>Loading...</div>
        </div>
      </UPageBody>

      <template #right>
        <UPageAside>
          <div v-if="propertyFilters.length > 0" class="flex flex-col gap-4">
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
          </div>
        </UPageAside>
      </template>
    </UPage>
  </UContainer>
</template>
