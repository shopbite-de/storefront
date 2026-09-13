# Quick view: flicker on open and on variant switch

Date: 2026-09-13. Branch `fix/quick-view-flicker`.

## Symptom

The product quick view drawer (`Product/QuickView.vue`, #325) flickers when
it opens for the first time and again whenever a variant is switched.

## Cause

`Product/Detail.vue` loaded its data in two stages. `useProductDetail`
fetched `/api/product/<id>` and showed a skeleton; once that arrived,
`Product/CrossSelling.vue` mounted and fetched
`/api/product/<id>/cross-selling` behind a second skeleton. The drawer
body therefore rendered three times: skeleton, options + extras skeleton,
everything. On phones the bottom sheet takes its height from the content,
so it grew in three steps while sliding in.

Switching a variant emitted the variant to `Detail.vue`, which passed the
new product to `CrossSelling.vue`; its `useFetch` key changed to the
variant id, `pending` went back to `true` and the extras collapsed into
the skeleton until the (identical) extras came back.

Measured with `scripts/perf/quick-view-layout.mjs`, which logs the drawer body per animation
frame against the production build with the La Fattoria data (product
18V "Insalata di Pollo", two variants, 12 extras):

| Viewport | Open: body height steps      | Variant switch: steps |
| -------- | ---------------------------- | --------------------- |
| Mobile   | 271 px → 464 px → 916 px     | 916 → 464 → 916 px    |
| Desktop  | 3 renders (fixed-height panel) | 2 renders |

## Fix

- `useProductDetail` requests the cross-selling together with the product
  detail, both keyed by the listing product id, and exposes one `pending`
  that covers both. The body renders once, after both responses.
- The cross-selling stays keyed by the listing product across variant
  switches. Shopware resolves the cross-selling of a variant to its
  parent's (checked against the live Store API: variant and parent of 18V
  return the same "Extras" list), so nothing is reloaded and the extras
  keep their place and selection.
- `Product/CrossSelling.vue` takes the mapped associations as a prop and
  no longer fetches or shows a skeleton.
- The skeleton in `Detail.vue` has the shape of the loaded body (a select,
  a row of extras, a row of ingredients), so the single swap moves less.

After the fix (same script):

| Viewport | Open: body height steps | Variant switch: steps |
| -------- | ----------------------- | --------------------- |
| Mobile   | 447 px → 916 px         | none (916 px)         |
| Desktop  | 2 renders               | none                  |

## Not changed

- The variant request (`/api/product/variant`) still runs after the select
  changes; the options, price and name update when it returns, without a
  loading state. That is a content update, not a re-layout.
- The first detail request starts about half a second after the tap,
  because the drawer chunk is created on first use (#314) and loads
  before `Detail.vue` mounts. Prefetching the detail from
  `useProductQuickView.show()` would hide that, but it is a separate
  change.
