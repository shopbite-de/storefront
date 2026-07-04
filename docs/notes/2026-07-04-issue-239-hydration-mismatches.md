# Issue #239 — SSR hydration mismatches on category pages

Date: 2026-07-04 · Branch: `fix/239-hydration-mismatch-category-pages`

## Symptom

`Hydration completed but contains mismatches.` — 466 occurrences/7d in
OpenObserve RUM, concentrated on `/c/*` category pages (Pizza worst).
In production Vue only reports **structural/text** mismatches, not
attribute/class ones, so the culprits had to be differing DOM nodes or text.

## Root causes (both reproduced locally)

### 1. Sorting select snapshotted before listing data existed

`Category/Listing.vue` initialized `currentSorting` with
`ref(currentSortingOrder.value ?? "Sortieren")`.

- **Server:** setup runs *before* `useLazyAsyncData` resolves (it is awaited
  later via `onServerPrefetch`), so the snapshot was always `"Sortieren"`.
- **Client hydration:** the payload is already present at setup, so the
  snapshot was the real sorting key and the `USelect` rendered its label
  (e.g. "Nr. 1-100") → text mismatch on **every** category page load.

**Fix:** derive the select value from listing data with a writable computed
(`sortingOverride ?? currentSortingOrder ?? "Sortieren"`). Both environments
now render from the same source. Bonus: SSR now shows the actual sorting.

**Rule of thumb:** never snapshot async-data-derived values with `ref(...)`
in setup — derive them with `computed` so SSR and hydration agree.

### 2. Price formatting depended on the visitor's browser locale

`usePrice` from `@shopware/composables` is a `createSharedComposable`: only
the **first** call's params count. `app.vue` called it first *without*
`localeCode`, which falls back to the browser locale. Server rendered
`8,00 €` (de), any non-German browser hydrated `€8.00` → text mismatch on
every product card. All the `localeCode: "de-DE"` params passed at other
call sites were silently ignored.

**Fix:** new platform-agnostic `useCommercePrice` composable (pure
`Intl.NumberFormat`, zero Shopware imports). Shop-wide currency + locale are
seeded once in `app.vue` from the session context
(`currency.isoCode` + `languageInfo.localeCode`) and shared via `useState`,
so they serialize into the payload and are identical on both sides.
All 8 `usePrice` call sites migrated; `usePrice` is no longer used.

This is a step toward the multi-platform goal: only the seeding in
`app.vue` is Shopware-aware; the composable itself is backend-neutral.

## Verification

- Playwright script loading category pages in dev mode (Vue prints detailed
  mismatch warnings there): 2 mismatch types before, **0 after**.
- Note: the dev backend uses `/speisekarte/<cat>/` seo URLs, not `/c/*` —
  same `[...all].vue` + `CategoryListing` component, different seo template.
- `Intl` formats `de-DE` currency with a **non-breaking space** (U+00A0)
  before `€` — tests assert it explicitly via ` `.

## Out of scope, noticed on the way

- `pnpm typecheck` is broken on main: `vue-tsc` is not a devDependency, and
  installing it temporarily surfaces pre-existing type errors in ~8 files
  (none related to this fix). → separate issue
- Every filter change in `Category/Listing.vue` sets `currentSorting` to
  `"Sortieren"`, which triggers a second, redundant listing fetch with
  `order=Sortieren` racing the `setFilters` fetch (Shopware silently ignores
  the invalid order). → separate issue
- `AnimatedSection` renders product cards with `opacity-0` in SSR HTML
  (IntersectionObserver reveals them post-mount) — content invisible without
  JS; potential SEO/CLS concern. → suggested issue
- `Header/Right.vue` hardcodes the phone number `tel:+49610471427` in the
  base layer — should come from config for multi-tenant demo shops.
  → suggested issue
- The 16 home-page mismatches from the RUM data were **not** reproducible
  locally; likely environment-specific. Re-check telemetry after this fix.
