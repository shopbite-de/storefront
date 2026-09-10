import { computed, ref, type Ref } from "vue";

export const SORTING_PLACEHOLDER = "Sortieren";

/**
 * Sorting select state for a listing that follows the listing data.
 *
 * The listing resolves after setup on the server, so a value snapshotted at
 * setup renders the placeholder there while the client (payload present)
 * renders the actual sorting: a hydration mismatch (#239, #295). The user's
 * choice is kept as an override; setting the placeholder clears it, so the
 * select follows the listing data again (e.g. after a new search or filter).
 */
export function useSortingSelection(
  currentSortingOrder: Ref<string | undefined>,
) {
  const sortingOverride = ref<string | null>(null);

  const currentSorting = computed<string>({
    get: () =>
      sortingOverride.value ?? currentSortingOrder.value ?? SORTING_PLACEHOLDER,
    set: (value) => {
      sortingOverride.value = value === SORTING_PLACEHOLDER ? null : value;
    },
  });

  return { currentSorting };
}
