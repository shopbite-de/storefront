# Cart upsell row

Date: 2026-09-14. Branch `feature/338-cart-upsell`, issue #338.

## Goal

Restaurants miss easy add-on sales (a dessert or a drink) before checkout.
Shop owners flag suggestion products with the boolean custom field
`shopbite_cart_upsell` (shopbite-de/shopware-plugin#18). "Cross-selling"
already means the extras of a product in this codebase, so the feature is
called upsell.

## Placement

The issue planned the row in the cart drawer. A first version there worked
(verified live), but Lirim decided to show it only on the order confirmation
step `/bestellung/bestaetigen`, inside the cart card between the line items
and shipping/total. The drawer and `/bestellung/warenkorb` render no row.

The confirmation step lists the line items without quantity input and delete
button, and that stays: a suggestion added by mistake is removed in the cart.

## Implementation

- `useCartUpsell`: `loadUpsellProducts()` reads up to 6 flagged products
  (`readProduct post /product`, `sw-inheritance: true`, sorted by name, only
  the fields the card needs). `addUpsellProduct()` adds a plain product line
  item with quantity 1 through `useCartMutations().addLineItems` (queue, lock
  retry, error toast), then pops the cart badge and tracks
  `Cart / UpsellAdd / <productNumber> / 1`. `isAdding(id)` covers the time the
  write is queued; a second click in that time is ignored.
- `Cart/Upsell.vue`: products already in the cart (plain or as a container
  child, `lineItemHoldsProduct`) are hidden, so a card disappears once its
  product is added; without cards nothing is rendered.
- `Cart/QuickView.vue` renders it lazily behind the `withUpsell` prop, which
  only `Checkout/Summary.vue` sets.
- `useAsyncData(…, { server: false })`: the confirmation step is rendered on
  the server, but `app.vue` loads the cart in `onMounted`. Filtering on the
  server would render cards that the browser hides, so the suggestions are
  loaded in the browser and the row appears after the request.

## Design

Iterated with Lirim on screenshots of the demo shop:

- The row sits in a tinted box (`bg-primary/5`, primary ring) with a sparkles
  icon, the heading "Dazu passt" and the hint "Mit einem Klick zur Bestellung
  hinzufügen". Small tiles without a frame looked like line items.
- One suggestion spans the full width of the card; with several, the cards are
  85 % wide in a horizontal snap scroller, so the next one peeks in (thin
  scrollbar for mouse users).
- Card: square cover flush on the left (112 px, 144 px from `sm`, placeholder
  icon without cover), number and name, price and an "Hinzufügen" button at
  the bottom. Below `sm` the button shows only the plus icon, the label does
  not fit next to the price. The cover is decorative (`alt=""`).

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

## Verified

- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`.
- `pnpm test:unit` without the local Matomo variables, as in CI. With Matomo
  configured in `.env` the run reports the three unhandled rejections of #323,
  which are unrelated.
- `pnpm build`: `components/Cart/Upsell.vue` is its own dynamic chunk; the
  heading and the custom field name only occur in that chunk.
- Demo Store API (shopware.shopbite.de, plugin field deployed, Tiramisu
  flagged): the request returns exactly `LF-144 Tiramisu` with price and
  cover. None of the 66 variants matches `childCount = 0` although the API
  serializes their child count as `0`, which confirms the variant filter
  finding above.
- Production build against the demo backend, Playwright on 1280×800 and
  390×844 with a guest checkout (script not committed, order not placed):
  - drawer and `/bestellung/warenkorb`: no row, the upsell chunk is not
    requested;
  - `/bestellung/bestaetigen`: the server HTML has no row; after hydration the
    Tiramisu card sits inside the cart card below the line item and above the
    total; the request carries `sw-inheritance: true` and the filter above;
  - plus: total 9,50 € → 15,00 €, badge 1 → 2, the row disappears, Tiramisu
    is a line item; Matomo sends `Cart / UpsellAdd / LF-144 / 1` (tracker
    hits were aborted in the check);
  - layout with three suggestions checked by extending the API response in
    the browser.
- Local guest registration needs a `storefrontUrl` that is a domain of the
  sales channel; the app sends the page origin, so the check replaced
  `http://localhost:3338` with `http://localhost:3000`.

## Found along the way

Direct loads of `/bestellung/zahlung-versand` and `/bestellung/bestaetigen`
log "Hydration completed but contains mismatches." and the stepper highlights
"Warenkorb" on the last step, also without the upsell row: #339.
