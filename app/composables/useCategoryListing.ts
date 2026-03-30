import { getListingFilters } from "@shopware/helpers";
import type { Schemas, operations } from "#shopware";
import type { NitroFetchRequest } from "nitropack";

export type CategoryListingCriteria = NonNullable<
  operations["readProductListingGet get /product-listing/{categoryId}"]["query"]
>;

export type ShortcutFilterParam = {
  code: string;
  value: string | string[] | undefined;
};

const DEFAULT_CRITERIA: CategoryListingCriteria = {
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
};

export function useCategoryListing(
  categoryId: string,
  _defaultCriteria: CategoryListingCriteria = DEFAULT_CRITERIA,
) {
  const nuxtApp = useNuxtApp();

  async function fetchListing(
    criteria: CategoryListingCriteria,
  ): Promise<Schemas["ProductListingResult"]> {
    // Send only the allowlisted filter params; the server merges them with the
    // fixed includes/associations/limit so clients cannot influence projections.
    const c = criteria as Record<string, unknown>;
    return await $fetch(`/api/listing/${categoryId}` as NitroFetchRequest, {
      query: {
        order: c.order,
        properties: c.properties,
        manufacturer: c.manufacturer,
        query: c.query,
        p: c.p,
      },
    });
  }

  const loading = ref(false);

  const { data: listing, pending } = useLazyAsyncData(
    `listing-${categoryId}`,
    () => fetchListing({}),
  );

  // Suppress skeleton during SSR hydration to prevent hydration mismatch.
  const showSkeleton = computed(() => pending.value && !nuxtApp.isHydrating);

  const elements = computed(() => listing.value?.elements ?? []);
  const sortingOrders = computed(() => listing.value?.availableSortings);
  const currentSortingOrder = computed(() => listing.value?.sorting);
  const availableFilters = computed(() =>
    getListingFilters(listing.value?.aggregations),
  );
  const currentFilters = computed(() => listing.value?.currentFilters);

  async function applySearch(criteria: CategoryListingCriteria) {
    loading.value = true;
    try {
      listing.value = await fetchListing(criteria);
    } finally {
      loading.value = false;
    }
  }

  async function changeSorting(order: string, query?: CategoryListingCriteria) {
    await applySearch({ ...query, order } as CategoryListingCriteria);
  }

  async function setFilters(filters: ShortcutFilterParam[]) {
    const filterObj: Record<string, unknown> = {};
    for (const f of filters) {
      filterObj[f.code] = f.value;
    }
    const appliedFilters = {
      query: currentFilters.value?.search,
      manufacturer: currentFilters.value?.manufacturer?.join("|"),
      properties: currentFilters.value?.properties?.join("|"),
      ...filterObj,
    };
    await applySearch(appliedFilters as CategoryListingCriteria);
  }

  async function resetFilters() {
    await applySearch({});
  }

  return {
    showSkeleton,
    loading,
    elements,
    sortingOrders,
    currentSortingOrder,
    availableFilters,
    currentFilters,
    changeSorting,
    setFilters,
    resetFilters,
  };
}
