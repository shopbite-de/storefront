import type {
  ProductListingResult,
  ListingCriteria,
} from "~/types/commerce/listing";
import type { NitroFetchRequest } from "nitropack";

type ListingFilter = {
  label: string;
  code: string;
  id: string;
  name: string;
  options?: Array<{ id: string; translated?: { name?: string } }>;
  entities?: Array<{ id: string; translated?: { name?: string } }>;
};

function getTranslatedName(entity: Record<string, unknown>): string {
  const translated = entity.translated as Record<string, unknown> | undefined;
  return (translated?.name ?? entity.name ?? "") as string;
}

function buildFilter(
  code: string,
  aggregation: Record<string, unknown>,
): ListingFilter {
  return {
    label: getTranslatedName(aggregation) || code,
    code,
    ...aggregation,
  } as ListingFilter;
}

function getListingFilters(aggregations: unknown): ListingFilter[] {
  if (
    !aggregations ||
    typeof aggregations !== "object" ||
    Array.isArray(aggregations)
  )
    return [];
  const filters: ListingFilter[] = [];
  for (const [code, aggregation] of Object.entries(
    aggregations as Record<string, unknown>,
  )) {
    const agg = aggregation as Record<string, unknown>;
    if (code === "properties" && Array.isArray(agg.entities)) {
      for (const entity of agg.entities as Record<string, unknown>[]) {
        filters.push(buildFilter(code, entity));
      }
    } else if (code !== "properties" && code !== "options") {
      filters.push(buildFilter(code, agg));
    }
  }
  return filters;
}

export type { ListingCriteria as CategoryListingCriteria };

export type ShortcutFilterParam = {
  code: string;
  value: string | string[] | undefined;
};

export function useCategoryListing(
  categoryId: string,
  initialProperties: string[] = [],
) {
  const nuxtApp = useNuxtApp();

  async function fetchListing(
    criteria: ListingCriteria,
  ): Promise<ProductListingResult> {
    // Send only the allowlisted filter params; the server merges them with the
    // fixed includes/associations/limit so clients cannot influence projections.
    return await $fetch(`/api/listing/${categoryId}` as NitroFetchRequest, {
      query: {
        order: criteria.order,
        properties: criteria.properties,
        manufacturer: criteria.manufacturer,
        query: criteria.query,
        p: criteria.p,
      },
    });
  }

  const loading = ref(false);

  const { data: listing, pending } = useLazyAsyncData(
    `listing-${categoryId}`,
    () =>
      fetchListing(
        initialProperties.length > 0
          ? { properties: initialProperties.join("|") }
          : {},
      ),
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

  async function applySearch(criteria: ListingCriteria) {
    loading.value = true;
    try {
      listing.value = await fetchListing(criteria);
    } finally {
      loading.value = false;
    }
  }

  async function changeSorting(order: string, query?: ListingCriteria) {
    await applySearch({ ...query, order });
  }

  async function setFilters(filters: ShortcutFilterParam[]) {
    const filterObj: Record<string, unknown> = {};
    for (const f of filters) {
      filterObj[f.code] = f.value;
    }
    const appliedFilters: ListingCriteria = {
      query: currentFilters.value?.search,
      manufacturer: currentFilters.value?.manufacturer?.join("|"),
      properties: currentFilters.value?.properties?.join("|"),
      ...filterObj,
    };
    await applySearch(appliedFilters);
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
