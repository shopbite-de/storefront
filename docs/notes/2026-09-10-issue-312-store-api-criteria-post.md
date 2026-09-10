# Issue #312: Store API criteria as POST body

As of 2026-09-10, branch `fix/312-store-api-criteria-post`.

## Cause

The server routes for listing, category, product and cross-selling sent their
criteria as `_criteria` query parameters (`encodeForQuery` from
`@shopware/api-client/helpers`), and `useNavigation` used the
`readNavigationGet` operation the same way. Shopware applies `associations`
and `limit` from the query string, but not the `includes` projection: every
entity came back with all of its fields. Measured on the La Fattoria Store
API (category "Pizza", 100 products): the listing route returned 285 KB with
92 fields per product; the same criteria as a POST body returns 147 KB with
the 11 requested fields. `/api/category/<id>` returned 40 fields incl.
`cmsPage`, `children` and `translations` although the route asked for five.
The category page shipped 546 KB of HTML (393 KB Nuxt payload).

## Solution

- `server/utils/storeApi.ts`: `storeApiPost(path, body, { headers })` for
  the Store API, plus `MEDIA_INCLUDES` (`media`, `media_thumbnail`,
  `product_media`) so category and product images keep the URL, thumbnails
  and intrinsic size that `mediaSrcSet`/`mediaSize` need (#273).
- Listing, category, product and cross-selling routes send their criteria as
  the POST body; the category route lists the fields the header,
  `useCategorySeo` and the menu-section schema read (`media`, `description`,
  `metaTitle`, `metaDescription`, `active`, `type`, …), which used to arrive
  only because the projection was ignored.
- `useNavigation` uses `readNavigation post /navigation/{activeId}/{rootId}`
  with the criteria as body (plus `id` in the includes).
- Cache keys of the `defineCachedEventHandler`s are unchanged.
- `useNavigationSearch` (project copy of the layer composable, older) still
  sends `_criteria` on GET for the SEO URL lookup; it uses no `includes`, so
  nothing to gain there.

## Verification

Production build against the La Fattoria Store API (category "Pizza", 100
products), uncompressed sizes:

| Response                  | Before | After                     |
| ------------------------- | ------ | ------------------------- |
| `/api/listing/<id>`       | 285 KB | 147 KB (11 fields/product) |
| `/api/category/<id>`      | 40 fields | 13 fields, 1 KB        |
| `/` HTML (Nuxt payload)   | 163 KB | 111 KB (32 KB)            |
| `/c/Pizza/` HTML (payload) | 546 KB (393 KB) | 314 KB (134 KB)  |

Category media keeps `url`, `thumbnails` (400/800/1920) and `metaData`.
Playwright category navigation (SSR, client link navigation, redirect,
back) shows the same product counts and no hydration warnings. Lighthouse
mobile on `/c/Pizza/` is unchanged on the CPU side (TBT 600 ms, main
thread 3.9 s): the gain is transfer size only; script cost is #314.

The product cover projection could not be checked on La Fattoria: 39 of
100 products carry a `coverId`, but none of them resolves to a `cover`,
with or without `includes` (the media rows are gone; a data problem of that
instance, unrelated to this change). Verified against Shopware's public
demo Store API instead: the product route's criteria return 17 product
fields with `cover.media.{url,alt,thumbnails,metaData}`, and the listing
criteria return the 11 product fields with the same media shape. Option
images only read `media.url`, which `MEDIA_INCLUDES` keeps.

235 unit tests, Prettier, ESLint, typecheck and build pass.
