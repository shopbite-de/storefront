import type { Schemas } from "#shopware";
import type { NitroFetchRequest } from "nitropack";

export function useListingSearch(initialQuery: string) {
  const nuxtApp = useNuxtApp();
  const loading = ref(false);
  let currentController: AbortController | null = null;

  async function fetchSearch(
    query: string,
    order?: string,
    signal?: AbortSignal,
  ): Promise<Schemas["ProductListingResult"]> {
    return await $fetch("/api/search" as NitroFetchRequest, {
      query: {
        query,
        ...(order && { order }),
      },
      signal,
    });
  }

  const hasInitialQuery = initialQuery.trim().length > 0;

  const { data: listing, pending } = useLazyAsyncData(
    `search-${initialQuery}`,
    () => fetchSearch(initialQuery),
    {
      immediate: hasInitialQuery,
    },
  );

  const showSkeleton = computed(() => pending.value && !nuxtApp.isHydrating);
  const elements = computed(() => listing.value?.elements ?? []);
  const sortingOrders = computed(() => listing.value?.availableSortings);
  const currentSortingOrder = computed(() => listing.value?.sorting);

  async function applySearch(query: string, order?: string) {
    currentController?.abort();
    currentController = new AbortController();
    const { signal } = currentController;

    loading.value = true;
    try {
      listing.value = await fetchSearch(query, order, signal);
    } catch (e) {
      if ((e as { name?: string }).name !== "AbortError") throw e;
    } finally {
      loading.value = false;
    }
  }

  async function changeSorting(order: string, query: string) {
    await applySearch(query, order);
  }

  return {
    showSkeleton,
    loading,
    elements,
    sortingOrders,
    currentSortingOrder,
    applySearch,
    changeSorting,
  };
}
