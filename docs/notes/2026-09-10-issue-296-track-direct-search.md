# Issue #296: Search not tracked on direct load of `/suche`

As of 2026-09-10, branch `fix/296-track-direct-search`.

## Cause

`useListingSearch` fetches the results during SSR via `useLazyAsyncData`; they end up in the payload. On a direct load the client hydrates with them, `elements` never changes, and the `watch(elements, …)` in `suche.vue` (not `immediate`) never fires. Only a search that re-fetches on the client (query change, sorting) triggered `trackSiteSearch`. Verified on a production build: direct load of `/suche?q=pizza` → `_paq` only had `trackPageView`.

## Solution

`app/composables/useSearchTracking.ts` replaces the inline watcher:

- Watches `[elements, showSkeleton]` with `immediate: import.meta.client`, so results already present at setup are tracked as well. On the server the watcher does not fire.
- Tracks once per search term (`lastTrackedTerm`). A sorting change re-fetches the same term and is no longer reported again (previously it produced a second `trackSiteSearch`).
- Client-side navigation: the skeleton is shown until the fetch completes, so the empty initial `elements` are not tracked.

## Verification

Production build against the La Fattoria Store API with Matomo configured: direct load of `/suche?q=pizza` pushes exactly one `trackSiteSearch`; a client-side search from `/c/Pizza/` to `/suche?q=salat` still pushes one.
