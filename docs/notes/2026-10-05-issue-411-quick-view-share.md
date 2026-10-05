# Issue #411: quick view configuration in the URL, share button

As of 2026-10-05, branch `feature/411-quick-view-share`.

## Decisions (agreed with Lirim)

- Readable parameters next to `produkt`: `ohne` = deselected main ingredients by name, `extras` = selected extras by product number, comma-separated. Unknown entries are ignored. IDs were rejected (long, unreadable links).
- Live: every change writes the URL with `router.replace` (no history entries); closing removes all three parameters.
- Share: Web Share API where available, otherwise clipboard + toast "Link kopiert". Icon button in the drawer header (`#actions` slot of `UDrawer`, before close).

## Implementation

- `app/utils/productUrl.ts`: parameter names, `parseListParam`, `withQuickViewConfiguration(query, configuration | undefined)` (replaces the three parameters, keeps filters).
- `useProductQuickView`: a variant switch changes `produkt` to a number that may not be in the list. Without care the drawer would swap its product (and re-mount `ProductDetail`, losing the selection) or load the variant. Numbers the drawer wrote itself are kept in `useState("quick-view-switched-numbers")`; for them the opened product stays. Reset when another product opens or the drawer closes.
- `useQuickViewConfiguration`: `initial` (parsed from the route) and `update()`; `QuickView.vue` passes `initial` to `ProductDetail`, which hands it to `DeselectIngredient`/`CrossSelling` (read once at setup, emitted immediately so the cart payload and the price include them), and emits `configuration-changed` on ingredient, extras and variant changes.
- Cross-selling route and `AssociationItemProduct` carry `productNumber`.
- The header number follows the selected variant (was the opened product's number; visible since variant links, #289).
- `useShareLink`: `canShare` is set in `onMounted`, so SSR and hydration render the same icon.

## Verification

Production build against the demo, Playwright: `?produkt=LF-21-gro%C3%9F&ohne=K%C3%A4se&extras=EXTRA-900,EXTRA-903` opens with Käse deselected, two extras checked, 12,00 € (10 + 2); toggling Tomatensoße appends it to `ohne`; switching to "Normal" sets `produkt=LF-21-normal`, the drawer stays open and keeps the selection; share copies the live URL and shows the toast (headless Chromium has no `navigator.share`); closing removes the parameters without a history entry, back goes to the previous page; no console errors, mobile and desktop. All unit + nuxt tests (new: helpers, initial selection, `useShareLink`), typecheck, ESLint green.
