import type { NitroFetchRequest } from "nitropack";
import type { MenuListing } from "../../shared/domain";

type ListingRequest = { order?: string; filters?: readonly string[] };

/**
 * The dishes of a menu section from the BFF (`/api/listing/[sectionId]`,
 * MenuListing): the server renders the first page, the guest's sorting and
 * filters load in the browser. The filters are the listing's filter
 * option ids (diets).
 */
export function useCategoryListing(
  sectionId: string,
  initialFilters: readonly string[] = [],
) {
  const nuxtApp = useNuxtApp();

  async function fetchListing(request: ListingRequest): Promise<MenuListing> {
    return await $fetch(`/api/listing/${sectionId}` as NitroFetchRequest, {
      query: {
        order: request.order,
        filters: request.filters?.length
          ? request.filters.join("|")
          : undefined,
      },
    });
  }

  const loading = ref(false);

  const { data: listing, pending } = useLazyAsyncData(
    `listing-${sectionId}`,
    () => fetchListing({ filters: initialFilters }),
  );

  // Suppress skeleton during SSR hydration to prevent hydration mismatch.
  const showSkeleton = computed(() => pending.value && !nuxtApp.isHydrating);

  const dishes = computed(() => listing.value?.dishes ?? []);
  const sortings = computed(() => listing.value?.sortings ?? []);
  const currentSorting = computed(() => listing.value?.sorting ?? undefined);
  const filters = computed(() => listing.value?.filters ?? []);
  const filterOptionIds = computed(() => listing.value?.filterOptionIds ?? []);

  async function applySearch(request: ListingRequest) {
    loading.value = true;
    try {
      listing.value = await fetchListing(request);
    } finally {
      loading.value = false;
    }
  }

  /** Another sorting, the applied filters kept. */
  async function changeSorting(order: string) {
    await applySearch({ order, filters: filterOptionIds.value });
  }

  /** Other filter options; the sorting falls back to the default. */
  async function setFilters(ids: readonly string[]) {
    await applySearch({ filters: ids });
  }

  async function resetFilters() {
    await applySearch({});
  }

  return {
    showSkeleton,
    loading,
    dishes,
    sortings,
    currentSorting,
    filters,
    filterOptionIds,
    changeSorting,
    setFilters,
    resetFilters,
  };
}
