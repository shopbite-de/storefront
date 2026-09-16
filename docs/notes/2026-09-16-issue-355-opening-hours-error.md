# Opening hours: error state and retry in the checkout

Date: 2026-09-16. Branch `fix/355-opening-hours-error`, issue #355.

## Problem

When the business hours or holidays request failed in the browser, the
confirmation step kept its loading state (#349): order button disabled with
spinner, delivery time section "Lade Öffnungszeiten...". Nothing retried.

## Decision (Lirim)

Retry automatically first, then show an error with a button: two more attempts
after 1 s and 3 s; if they fail too, the delivery time section shows an alert
"Öffnungszeiten konnten nicht geladen werden" with "Erneut versuchen", and the
order button carries the same text (disabled, no spinner).

## Implementation

- `utils/retry.ts`: `withRetries(request, delays)`.
- `useBusinessHours`/`useHolidays`: the request is wrapped in `withRetries` with
  `OPENING_HOURS_RETRY_DELAYS` in the browser only; on the server a retry would
  delay every page (the footer prefetches the hours). Both now return `status`.
- `useOpeningHoursData`: `isLoaded` (both there), `hasFailed` (a missing one has
  status `error` and no missing one is `pending`), `isLoading`, `retry()`
  (refreshes only what is missing).
- `Checkout/Summary.vue` and `Checkout/DeliveryTimeSelect.vue` use it. The time
  input and the holiday badge now need both data sets; before, the input showed
  without bounds when only the holidays were loaded.

## Findings

- Nuxt's `useAsyncData` keeps `error` set while a refresh runs and resets `data`
  to the default on failure; `status` is the reliable signal (`pending` during
  a retry).
- On checkout pages the business hours are in the SSR payload
  (`Footer/Contact.vue` prefetches them), and `app.vue`'s refresh on mount is
  served from that payload while hydrating. The browser then requests only the
  holidays, so a browser-side failure of the business hours request does not
  happen on a first load.
- The footer renders after the checkout on the server. If its prefetch fails,
  the payload carries the error and the browser would hydrate `status: error`
  while the server rendered the checkout without it. `hasFailed` is therefore
  `false` until the component is mounted.

## Verified

- Tests: `test/unit/retry.spec.ts`, `test/nuxt/useOpeningHoursData.test.ts`
  (including "no failure before mounting"), `test/nuxt/CheckoutSummary.test.ts`
  (error label).
- Production build against the demo backend, guest session, holidays request
  answered with 500 in Playwright: three attempts, 4–6 s after loading the alert and
  the button text, no hydration warning; "Erneut versuchen" with the request
  unblocked loads the holidays and the button reads "Jetzt bestellen!". Without
  blocking: unchanged flow, time input present.
- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`,
  `pnpm test:unit` without the Matomo variables (276 tests).
