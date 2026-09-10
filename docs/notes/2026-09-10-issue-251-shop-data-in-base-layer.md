# Issue #251: shop-specific data hardcoded in the base layer

As of 2026-09-10, branch `fix/251-header-phone-from-config`.

## Audit of `app/` (base layer code)

| Place | Hardcoded | Now |
| --- | --- | --- |
| `Header/Right.vue` | `tel:+49610471427` (La Fattoria) | `site.telephone`, button hidden without a number |
| `BottomNavi.vue` (not used by any page, but exported by the layer) | OpenStreetMap directions to La Fattoria's coordinates, same phone number | `site.googleBusinessProfileUrl` for the route, `site.telephone` for the call; each button hidden without a value |
| `pages/bestellung/[id]/index.vue` | `tel:+4917623456789` ("call us" card) | `site.telephone`, card hidden without a number |
| `useValidCitiesForDelivery` | delivery cities `Obertshausen, Lämmerspiel, Hausen` and a Geoapify bounding box around Obertshausen | `runtimeConfig.public.shopBite.delivery.{cities,boundingBox}` (`NUXT_PUBLIC_SHOP_BITE_DELIVERY_CITIES`, `NUXT_PUBLIC_SHOP_BITE_DELIVERY_BOUNDING_BOX`); empty means no restriction / no filter, which the address validation and autocomplete already handle |

`content/` (demo content that a shop overrides) still carries La Fattoria's phone number and gallery alt texts, the ShopBite demo's imprint and the "Kantstraße 6" pickup address in `zahlung-und-versand.md`. Left as is: it is content, not code, and every shop replaces it; worth a separate clean-up of the demo content.

## Behaviour change

A shop that relied on the hardcoded delivery area (La Fattoria) must set `NUXT_PUBLIC_SHOP_BITE_DELIVERY_CITIES="Obertshausen,Lämmerspiel,Hausen"` and `NUXT_PUBLIC_SHOP_BITE_DELIVERY_BOUNDING_BOX="8.822251,50.055026,8.899077,50.104327"` before upgrading; otherwise every city passes the address validation. The phone buttons need `NUXT_PUBLIC_SITE_TELEPHONE` (set with #290 anyway).

## Verification

See the PR description.
