# Order button: loading state for the opening hours

Date: 2026-09-16. Branch `fix/349-order-button-loading`, issue #349.

## Problem

`app.vue` loads business hours and holidays after mounting. Until then
`Checkout/DeliveryTimeSelect.vue` has no time to select and reports
`valid = false`, and `Checkout/Summary.vue` labelled the order button
"Wir haben aktuell leider geschlossen". The server HTML carried that label as
well, so the confirmation step always said "closed" first.

## Change

`Summary.vue` reads `businessHours` and `holidays` from `useBusinessHours` and
`useHolidays` (the same "loaded" check as `useStoreStatus`). While either is
missing and customer data is available, the button is disabled, shows the
spinner and the label "Lade Öffnungszeiten …". "Einloggen oder Kundendaten
erfassen" keeps priority, it does not depend on the hours.

`DeliveryTimeSelect` was left unchanged: emitting a second state from it would
repeat the pattern of #339 (a child changing parent state during setup).
Reading the shared `useAsyncData` state directly renders the same on the
server and at hydration (both without data).

A failed request leaves the data empty, so the button keeps the loading state,
as the "Lade Öffnungszeiten..." badge of `DeliveryTimeSelect` already does.
Neither retries the request.

## Verified

- `test/nuxt/CheckoutSummary.test.ts`: loading, closed after loading, order
  possible with a valid time. The loading test fails without the change.
- Production build against the demo backend with a guest session: the server
  HTML has the loading label, the button then goes from
  "Lade Öffnungszeiten …" (disabled, spinner) straight to "Jetzt bestellen!",
  also with the business hours request delayed by 3 s; no "closed" in
  between, no hydration warning.
- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`,
  `pnpm test:unit` without the Matomo variables (267 tests).
