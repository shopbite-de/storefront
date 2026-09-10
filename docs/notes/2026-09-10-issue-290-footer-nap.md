# Issue #290: Address, phone, opening hours and Google link in the footer

As of 2026-09-10, branch `feature/290-footer-nap`.

## Decisions (agreed with Lirim)

- Data comes from `runtimeConfig.public.site` (platform-neutral, via env): `address.street`, `address.postalCode`, `address.city` (since #274), `telephone`, `googleBusinessProfileUrl`. The same values will later feed the `Restaurant` schema from #272. Long-term the values move to the Shopware plugin config (shopbite-de/shopware-plugin#15, storefront #298), env stays as fallback.
- A dedicated contact block above the Shopware footer navigation (not extra columns), so it stays readable regardless of the number of navigation columns.
- Opening hours: consecutive days with identical intervals are grouped, days without hours show as "Ruhetag". No holidays/closing days in the footer.
- La Fattoria: only a note in the PR, no special handling (see below).

## Implementation

- `app/components/Footer/Contact.vue` (`<address>` for NAP, `<dl>` for hours), rendered in the `#top` slot of `Footer.vue`. Empty values are hidden; without contact data and without opening hours the block renders nothing.
- `app/utils/openingHours.ts`: `groupOpeningHours` (weekdays 1 = Mon … 7 = Sun, seconds stripped, intervals sorted by opening time) and `toTelHref`.
- **SSR:** `useBusinessHours` uses `immediate: false`; `app.vue` only loads the hours `onMounted` (open/closed toast). To get the hours into the HTML, the footer calls `onServerPrefetch(() => refresh())`. The data lands in the payload under the key `business-hours`, the client hydrates with it, and `app.vue` refreshes on mount as before. Costs one Store API call per SSR render.
- Fixed the "Bestellsystm" typo in the footer.

## Pitfalls

- A `mockNuxtImport("useRuntimeConfig")` without `app.baseURL` breaks the router setup of the Nuxt test environment (`useRouter()` undefined, see #294; `HeaderRight.test.ts` mocks with `app.baseURL` and works). `test/nuxt/FooterContact.test.ts` sets the real runtime config via `Object.assign` instead.
- After switching branches across #292, `@nuxtjs/sitemap` was missing from `node_modules` (`nuxt prepare`: "Cannot resolve module"). Run `pnpm install --frozen-lockfile` after every switch to a newer `main`.

## After the release for Pizzeria La Fattoria

- Set env: `NUXT_PUBLIC_SITE_ADDRESS_STREET="Kantstr. 6"`, `NUXT_PUBLIC_SITE_ADDRESS_POSTAL_CODE=63179`, `NUXT_PUBLIC_SITE_ADDRESS_CITY=Obertshausen`, `NUXT_PUBLIC_SITE_TELEPHONE`, `NUXT_PUBLIC_SITE_GOOGLE_BUSINESS_PROFILE_URL`.
- **Clarify the phone number:** imprint says `+49 6104 71427`, the Shopware footer navigation `tel:+491726723920`. For NAP consistency use one number, identical to the Google Business Profile.
- Remove the link categories "Kantstraße 6" and "Tel: …" in the Shopware folder "Unternehmen", otherwise address and phone appear twice in the footer.
