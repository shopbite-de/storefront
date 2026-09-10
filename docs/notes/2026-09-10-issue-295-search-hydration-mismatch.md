# Issue #295: Hydration mismatch on direct load of `/suche`

As of 2026-09-10, branch `fix/295-search-hydration-mismatch`.

## Cause

Vue (dev server) named the element:

```
Hydration text mismatch in <SelectValue>
  - rendered on server: "Sortieren"
  - expected on client: "Top results"
```

`suche.vue` snapshotted the sorting select at setup: `ref(currentSortingOrder.value ?? "Sortieren")`. On the server the listing (`useLazyAsyncData`) resolves after setup and watchers do not run during SSR, so the server rendered the placeholder. The client hydrates with the payload present and rendered the actual sorting. Same defect as #239, which was fixed in `Category/Listing.vue` only.

## Solution

- `app/composables/useSortingSelection.ts` holds the pattern from #239 once: `currentSorting` is a writable computed that follows the listing data and keeps the user's choice as an override; setting the placeholder clears the override. Exported `SORTING_PLACEHOLDER`.
- `suche.vue` and `Category/Listing.vue` use it. In `suche.vue` a new search term also resets the override (as #249 did for filters), because `applySearch` sends no order and the response falls back to the default sorting.
- Unit test `test/unit/useSortingSelection.spec.ts` covers the setup-before-data case.

## Verification

Dev server against the demo Shopware, Playwright collecting Vue hydration warnings: before the fix `/suche?q=pizza` reported the mismatch above; after it `/suche?q=pizza`, `/suche?q=salat` and `/speisekarte/pizza/` report none. Changing the sorting on `/suche` still triggers a search request with `order` and updates the select. Production build checks in the PR.
