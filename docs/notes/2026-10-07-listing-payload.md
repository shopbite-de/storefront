# Listing payload: property groups were not projected

As of 2026-10-07, branch `feature/payload-size`. Prompted by the Nuxt 4.6 features for lighter payloads (`useAsyncData` `serialize: false`, a dev warning above 100 kB payload).

## Payload per page (demo backend, before)

| Page | HTML | `__NUXT_DATA__` | Largest key |
| --- | --- | --- | --- |
| `/` | 151 KB | 44 KB | `top-sellers` 15 KB |
| `/Speisekarte/` (63 products) | 463 KB | 224 KB | `listing-<id>` 219 KB |
| `/impressum` | 69 KB | 22 KB | `sessionContext` 8 KB |

Only the menu page was over the 100 kB threshold. `serialize: false` does not fit there: the product cards hydrate on scroll (`hydrateWhenVisible`) and need the listing data in the browser. Without it in the payload, the browser would fetch the listing again.

## Cause

`server/api/listing/[categoryId].get.ts` projected the property groups under the key `property`. The entity is `property_group` (`useTopSellers` already used the right name), so the groups came back with every field (`createdAt`, `updatedAt`, `sortingType`, `filterable`, …). Each option also carried its whole group once more. On top of that the product projection included `properties` (all options with their group) next to `sortedProperties` (the same options, grouped):

- `sortedProperties` 124 KB, `properties` 95 KB of 284 KB elements.

The card only reads `sortedProperties` (group `translated.name`, `displayType`, option `translated.name`, `media.url`). The quick view loads its product separately from `/api/product/[productId]`.

## Change

- `property_group: ["id", "name", "translated", "displayType", "options"]` instead of `property`.
- `property_group_option` without `group`.
- `properties` and `propertyIds` dropped from the product projection.

Result for `/Speisekarte/`: listing response 295 → 103 KB, payload 224 → 103 KB, HTML 463 → 342 KB. The rendered HTML of the page is unchanged (diff without scripts and asset hashes is empty), and so are the card data (`sortedProperties` as the card reads it) and the filter aggregations for all 63 products. Smoke test (menu, quick view, add to cart, cart, deep link) shows no console errors or hydration warnings.

## Not changed

- `server/api/product/[productId].get.ts` and `components/Product/Category.vue` use the same wrong key `property`. The product route also serves the configurator and the ingredient selection (`option.group.name`), so a projection there needs its own check of every field the quick view reads.
- `calculatedPrice` (21 KB for 63 products, mostly `calculatedTaxes`/`taxRules`) is left as it is.

## `useAsyncData` addons (Nuxt 4.6): not used

`createUseAsyncData` with an addon could replace `withRetries` (`app/utils/retry.ts`) in `useBusinessHours` and `useHolidays`. It would need a custom composable factory and an addon definition to replace two five-line call sites of a plain, unit-tested helper, so the helper stays.
