# Issue #251: shop-specific data hardcoded in the base layer

As of 2026-09-10, branch `fix/251-header-phone-from-config`.

## Audit of `app/` (base layer code)

| Place | Hardcoded | Now |
| --- | --- | --- |
| `Header/Right.vue` | `tel:+49610471427` (La Fattoria) | `site.telephone`, button hidden without a number |
| `BottomNavi.vue` (not used by any page, but exported by the layer) | OpenStreetMap directions to La Fattoria's coordinates, same phone number | `site.googleBusinessProfileUrl` for the route, `site.telephone` for the call; each button hidden without a value |
| `pages/bestellung/[id]/index.vue` | `tel:+4917623456789` ("call us" card) | `site.telephone`, card hidden without a number |
| `useValidCitiesForDelivery` | delivery cities `Obertshausen, Lämmerspiel, Hausen` and a Geoapify bounding box around Obertshausen | removed, see below |

`content/` (demo content that a shop overrides) still carries La Fattoria's phone number and gallery alt texts, the ShopBite demo's imprint and the "Kantstraße 6" pickup address in `zahlung-und-versand.md`. Left as is: it is content, not code, and every shop replaces it; worth a separate clean-up of the demo content.

## Decision on the delivery area (Lirim)

Where the shop delivers is decided by the Shopware cart rules, not by the storefront. The client-side city check is therefore gone entirely, not turned into a config:

- `useValidCitiesForDelivery`, the `validCities` option of `useAddressValidation`, `isInvalidCity` and the "An diese Adresse können wir leider nicht liefern" alert in `Address/Fields.vue` are removed; the address suggestions are no longer filtered by city.
- What remains is `useAddressSuggestionArea`: an optional Geoapify bounding box (`runtimeConfig.public.shopBite.addressAutocomplete.boundingBox`, `NUXT_PUBLIC_SHOP_BITE_ADDRESS_AUTOCOMPLETE_BOUNDING_BOX`) that narrows the address suggestions. Pure convenience, empty means no filter.
- A first version of this branch had made the cities configurable (`NUXT_PUBLIC_SHOP_BITE_DELIVERY_CITIES`); that variable does not exist.

## Behaviour change

The checkout no longer warns about cities outside the delivery area while typing; Shopware rejects such addresses through its rules as before (see #240 for how a blocked shipping method surfaces). The phone buttons need `NUXT_PUBLIC_SITE_TELEPHONE` (set with #290 anyway).

## Verification

See the PR description.
