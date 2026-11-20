import type { Ref } from "vue";
import type { Dish } from "../../shared/domain";

/**
 * Reports a site search to Matomo once its results are settled, once per
 * search term.
 *
 * Runs immediately on the client so a page loaded directly (results already
 * in the SSR payload, so `dishes` never changes) is tracked too (#296).
 * Sorting changes re-fetch the same term and are not reported again.
 */
export function useSearchTracking(
  query: Ref<string>,
  dishes: Ref<readonly Dish[]>,
  showSkeleton: Ref<boolean>,
) {
  const { trackSearch } = useTrackEvent();
  let lastTrackedTerm: string | null = null;

  watch(
    [dishes, showSkeleton],
    ([found, skeleton]) => {
      const term = query.value;
      if (!term || skeleton || term === lastTrackedTerm) return;
      lastTrackedTerm = term;
      trackSearch(
        term,
        found.map((dish) => dish.number),
      );
    },
    { immediate: import.meta.client },
  );
}
