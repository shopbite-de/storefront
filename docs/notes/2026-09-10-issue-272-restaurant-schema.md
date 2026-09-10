# Issue #272: Restaurant and Menu schema

As of 2026-09-10, branch `feature/272-restaurant-schema`.

## Decisions (agreed with Lirim)

- **Own builders + `useHead`** instead of `nuxt-schema-org`: the storefront already writes `CollectionPage` and `BreadcrumbList` JSON-LD by hand, the builders in `app/utils/schema.ts` are pure functions (unit-testable, an acceptance criterion), no new dependency, platform-neutral.
- **Menu split:** the home page carries `Restaurant` + `Menu` with one `MenuSection` per menu category (name, URL) from the menu navigation that is loaded anyway; each category page carries a `MenuSection` with its products as `MenuItem` incl. `offers.price` from the listing that is loaded anyway. A full menu on the home page would have meant ~41 listing requests during SSR and 60–80 KB more HTML for La Fattoria (#273).
- Data source is `runtimeConfig.public.site` (as for the footer, #290) plus two new keys: `address.country` (default `DE`) and `priceRange`. Later the plugin config (shopbite-de/shopware-plugin#15, #298) can feed the same builders.
- `Product` schema on product pages waits for #289 (there are no product pages yet).

## Implementation

- `buildOpeningHoursSpecification`: days with identical intervals share one entry (`dayOfWeek` array). `buildSpecialOpeningHoursSpecification`: closing days with `opens`/`closes` at `00:00` (Google's convention), dates taken from the first ten characters of the plugin's ISO timestamps (UTC; the admin enters local dates, which map to the same UTC date for CET/CEST).
- `useRestaurantSchema` (home page) prefetches business hours and holidays on the server (`onServerPrefetch`, same `useAsyncData` keys as `app.vue`/footer, so no duplicate requests) and reads the menu sections from `useNavigation(true).menuCardMenu`.
- `useMenuSectionSchema` (category listing) reads the loaded `elements`; currency from `useCommercePrice` (session context).
- Empty values are dropped (`compact`), so a shop without address or phone still emits a valid node.

## Pitfalls found on the first run

- Nuxt parses a numeric env value (`NUXT_PUBLIC_SITE_ADDRESS_POSTAL_CODE=63179`) into a number; `postalCode` is coerced to a string in the builder.
- `dayOfWeek` lists are sorted Monday to Sunday; the plugin returns Sunday (7) before Saturday in insertion order.
- Menu sections nest: `Nudeln` carries its nine pasta subcategories as `hasMenuSection`.

## Verification

Production build against the La Fattoria Store API with the NAP env variables set: the home page HTML carries one `Restaurant` node (3 KB) with address, phone, cuisine, price range, `sameAs`, two grouped `openingHoursSpecification` entries, two `specialOpeningHoursSpecification` entries (holidays from the plugin), and a `Menu` with nine sections, two of them nested. `/c/Pizza/` carries `CollectionPage`, `BreadcrumbList` and a `MenuSection` with 29 `MenuItem`s incl. `offers` in EUR (3 KB). The Rich Results Test and the Schema Markup Validator need a public URL, so that check happens after the deploy.
