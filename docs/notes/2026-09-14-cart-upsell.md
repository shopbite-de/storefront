# Cart upsell row

Date: 2026-09-14. Branch `feature/338-cart-upsell`, issue #338.

## Goal

The cart drawer only listed the line items and the total, so restaurants
missed easy add-on sales (a dessert or a drink before checkout). Shop owners
flag suggestion products with the boolean custom field `shopbite_cart_upsell`
(shopbite-de/shopware-plugin#18). "Cross-selling" already means the extras of
a product in this codebase, so the feature is called upsell.

## Implementation

- `useCartUpsell`: `loadUpsellProducts()` reads up to 6 flagged products
  (`readProduct post /product`, `sw-inheritance: true`, sorted by name, only
  the fields the tile needs). `addUpsellProduct()` adds a plain product line
  item with quantity 1 through `useCartMutations().addLineItems` (queue, lock
  retry, error toast), then pops the cart badge and tracks
  `Cart / UpsellAdd / <productNumber> / 1`. `isAdding(id)` covers the time the
  write is queued; a second click in that time is ignored.
- `Cart/Upsell.vue`: tiles with cover (or the placeholder of
  `Product/CardCompact.vue`), number, name, price and a plus button. Products
  already in the cart (plain or as a container child, `lineItemHoldsProduct`)
  are hidden, so a tile disappears once its product is added; without tiles
  nothing is rendered.
- `Cart/QuickView.vue` renders it behind the `withUpsell` prop, only the header
  drawer sets it. `/bestellung/warenkorb` and the checkout stay without it.

## Variant filter (differs from the issue)

The issue excluded variant parents with `childCount = 0`. That also excludes
every variant: Shopware's `ProductIndexer` runs the `ChildCountUpdater` only
for main products (`filterVariants`: `parent_id IS NULL`), and
`product.child_count` is a nullable column without default
(`Migration1562841035AddProductChildCount`). Variants keep `NULL`; core's
`CheapestPriceUpdater` checks `child_count = 0 OR parent_id IS NOT NULL` for
the same reason. The filter is therefore `childCount = 0 OR childCount = null`,
which still drops parents (`> 0`) but keeps flagged variants and the variants
of a flagged parent (inheritance), as the plugin's help text describes.

With inheritance a variant shows the parent's name without its options, so two
flagged variants of one product look alike in the row.

## Decisions

- The row sits at the top of the totals block, directly above shipping and
  total. The drawer spreads line items and totals apart (`justify-between`),
  so in the desktop side panel the row stays next to the checkout button
  instead of below the last line item.
- `useAsyncData` is not awaited: the drawer is client-only and shows the line
  items immediately; the row follows once the request returns.
- The cover image is decorative (`alt=""`), the name is right below it; the
  media `alt` field is therefore not requested.
- The scroller keeps a thin scrollbar (the top sellers row hides it): on
  desktop the drawer is a side panel used with a mouse.

## Verified

- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`.
- `pnpm test:unit`: 49 files, 264 tests, run without the local Matomo
  variables as in CI. With Matomo configured in `.env` the run reports the
  three unhandled rejections of #323, which are unrelated.
- `pnpm build`: `components/Cart/Upsell.vue` is its own dynamic chunk
  (3.5 KB); the heading and the custom field name only occur in that chunk,
  so the entry chunk only gains `trackUpsellAdd` and `lineItemHoldsProduct`.
- Demo Store API (shopware.shopbite.de, plugin field deployed, Tiramisu
  flagged): the request returns exactly `LF-144 Tiramisu` with price and
  cover. None of the 66 variants matches `childCount = 0` although the API
  serializes their child count as `0`, which confirms the variant filter
  finding above.
- Production build against the demo backend, Playwright on 1280×800 and
  390×844 (script not committed):
  - empty cart: drawer without the row, the upsell chunk is not requested;
  - Pizza Calzone in the cart: "Dazu passt" with the Tiramisu tile between
    the line item and the total, the request carries `sw-inheritance: true`
    and the filter above;
  - plus: badge 1 → 2 with the pop animation, the row disappears, Tiramisu is
    a line item; Matomo sends `Cart / UpsellAdd / LF-144 / 1` (tracker hits
    were aborted in the check);
  - `/bestellung/warenkorb` shows both line items and no row.
