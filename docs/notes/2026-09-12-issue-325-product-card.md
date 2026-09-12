# Issue #325: Product card redesign

As of 2026-09-12, branch `feature/325-product-card`.

## Decision

Design canvas "Produktkarten Varianten"
(https://claude.ai/code/artifact/95cc5132-1515-477f-af62-3afa79d0ee3c):
three directions (A compact with thumbnail, B dense menu list, C visual
with a large image), then three derivatives of C for shops without
product photos, then five levels of button emphasis. Chosen: **C1** (the
anatomy of C, the image block only when the product has a cover) with
button level **B1** (`variant="subtle"`). La Fattoria has no product
covers at all, the ShopBite demo a few, so the card must look finished
without any image.

## Changes

- `Product/Card.vue`: an `article` with `ring ring-default rounded-xl
  shadow-md`, the cover as `h-44 object-cover` on top with the diet badge
  and the wishlist button as overlays, then number (primary, `text-xs`),
  name (`text-lg font-bold`), description, price on the right with a
  "n× im Warenkorb" hint (`useProductCartQuantity`), the main ingredients
  as neutral soft chips (`Product/CardIngredients.vue`, replaces
  `CardDescription.vue`), the diet badge as a green chip when there is no
  image (`CardDietBadges` got a `variant` prop).
- `Product/CardFooter.vue`: one primary button. Products with variants
  (`childCount > 0`) or an active cross-selling show "Auswählen" and open
  the options collapsible as before; all others go straight into the cart
  (`useAddToCart` with the listing product, the existing success toast).
  `available === false` disables it as "Ausverkauft". Products with main
  ingredients but no options keep a ghost "Anpassen" button for the
  ingredient deselection. Detection lives in `app/utils/product.ts`.
- `server/api/listing/[categoryId].get.ts` and `server/api/search.get.ts`
  add `available`, `childCount` and the `crossSellings` association
  (`id`, `active`) to the fixed projection. Verified against the La
  Fattoria Store API: every pizza carries an active "Extras" cross-selling,
  drinks none.
- `AddToWishlist.vue` takes `size` and `variant` (outline, 44 px in the
  footer; soft on a white circle over the image) and an `aria-label`.
- Category listing, search page and `Product/Category.vue` render two
  columns from `xl`; `CardSkeleton.vue` follows the new anatomy.
- The e2e helper `selectProductAndAddToCart` handles both paths: options
  (quantity input) or repeated direct taps checked against the cart hint.

## Verification

- Production build with the La Fattoria API: `/c/Pizza/` shows "Auswählen"
  and opens the options with the quantity input; `/c/Getraenke/` shows
  "In den Warenkorb", two taps give "2× im Warenkorb" and the header badge
  2, the toast appears. Screenshots mobile light/dark and desktop (two
  columns) reviewed; no page errors.
- Lighthouse mobile on `/c/Pizza/` (branch based on `main`, i.e. without
  the #319 stylesheet changes): 967–1063 ms Style & Layout, 1055–1212 ms
  script evaluation, TBT 276–314 ms. The `main` build measured directly
  afterwards on the same machine gave 941–1223 ms, 1063–1479 ms and TBT
  247–545 ms, so the card is within the run-to-run spread. CDP CPU
  profiles of both builds (4× throttle) are equal within 5 %
  (2,410 ms vs 2,525 ms sampled, the same top functions), and static
  copies of both pages have the same first layout (199 ms). The chips are
  plain spans with the `UBadge` classes rather than `UBadge` instances so
  that hydrating a card does not run a tailwind-variants merge per chip.
- Unit tests (`test/unit/product.spec.ts`), Prettier, ESLint, typecheck
  and build pass. The unit run still exits 1 because of #323.

## Follow-ups (not in this issue)

- Options as a bottom sheet with extras as chips and the total in the
  button (canvas artboard "Optionen") instead of the inline collapsible,
  whose select and solid button do not match the new card yet.
- Sticky cart bar on mobile once the cart holds items.
- A cross-selling that is active but has no assigned products still
  counts as "has options"; the listing cannot tell without loading the
  products.
