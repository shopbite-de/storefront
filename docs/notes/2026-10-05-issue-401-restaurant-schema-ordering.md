# Issue #401: ordering, delivery area, geo and payment in the Restaurant schema

As of 2026-10-05, branch `feature/401-restaurant-schema-ordering`. Part of the AI visibility issues #400–#404.

## Decisions (agreed with Lirim)

- Delivery areas, coordinates and reservations come from `runtimeConfig.public.site` (env), like the address. Moving them to the plugin configuration is #298.
- Payment methods are read live from the Store API (`readPaymentMethod`, `onlyAvailable`, `includes` in the POST body, #312): one extra request when the home page renders on the server.

## Implementation

- `buildRestaurantSchema` adds `geo` (only with both coordinates; env values may be numbers or strings), `areaServed`, `acceptsReservations` (`false` is kept), `paymentAccepted` (names joined with ", "), `currenciesAccepted` and `potentialAction`.
- `OrderAction` only when the plugin reports `isCheckoutEnabled`. Target is `/speisekarte` (the same URL as `hasMenu`; it redirects to the menu category). `deliveryMethod`: `OnSitePickup` when an address street is set, `DeliveryModeOwnFleet` when delivery areas are set. Shopware shipping methods do not tell pickup and delivery apart (the demo has only `shipping_standard`), so they are not used.
- `NUXT_PUBLIC_SITE_DELIVERY_AREAS` is comma-separated; a JSON array (parsed by Nuxt) works too.
- Payment method names are shown as configured in Shopware (demo: "Nachnahme"); shops should name them the way customers say it ("Barzahlung bei Lieferung").

## Verification

Production build against the demo backend with the new env variables: the home page `Restaurant` node carries `geo`, both delivery areas, `acceptsReservations: true`, `paymentAccepted: "Nachnahme"`, `currenciesAccepted: "EUR"` and the `OrderAction` with pickup and own delivery. Without the new variables only `paymentAccepted`, `currenciesAccepted` and `potentialAction` (without `deliveryMethod`) are added. Unit + nuxt tests, typecheck, ESLint green.

Docs: homepage branch `docs/401-restaurant-schema-ordering` (configuration page, DE/EN), including the note that `NUXT_PUBLIC_SITE_CUISINE` is a cuisine name: La Fattoria sets `italienische`, which produces "italienische in Obertshausen" in its meta description.
