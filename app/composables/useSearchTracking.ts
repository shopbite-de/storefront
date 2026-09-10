import type { Ref } from "vue";
import type { Schemas } from "#shopware";

/**
 * Reports a site search to Matomo once its results are settled, once per
 * search term.
 *
 * Runs immediately on the client so a page loaded directly (results already
 * in the SSR payload, so `elements` never changes) is tracked too (#296).
 * Sorting changes re-fetch the same term and are not reported again.
 */
export function useSearchTracking(
  query: Ref<string>,
  elements: Ref<Schemas["Product"][]>,
  showSkeleton: Ref<boolean>,
) {
  const { trackSearch } = useTrackEvent();
  let lastTrackedTerm: string | null = null;

  watch(
    [elements, showSkeleton],
    ([products, skeleton]) => {
      const term = query.value;
      if (!term || skeleton || term === lastTrackedTerm) return;
      lastTrackedTerm = term;
      trackSearch(
        term,
        products.map((product) => product.productNumber),
      );
    },
    { immediate: import.meta.client },
  );
}
