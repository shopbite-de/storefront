# Issue #365: hydration mismatch on the home page

## Cause

The hero status line ("Geöffnet bis …" / "Geschlossen · öffnet …") was
rendered on the server. `useRestaurantSchema` (home page JSON-LD, #272)
prefetches business hours and holidays with `onServerPrefetch`, so
`useStoreStatus` had data on the server and computed the status with the
**server's** clock and time zone. The browser computed it again during
hydration with its own clock. Whenever the two disagreed (a UTC server is two
hours behind the shop in Europe/Berlin, which often crosses an opening
boundary), Vue reported `Hydration completed but contains mismatches.`

In production Vue does not rectify class mismatches, so affected visitors could
also see the wrong open/closed dot.

## Reproduction

The demo backend is open 00:00–23:59, so the real clock never differs. With
Playwright's clock set to 23:59:30 Europe/Berlin while the dev server renders
at the real time:

```
[Vue warn]: Hydration text mismatch … rendered on server: " Geöffnet bis 23:59"
  - expected on client: " Geschlossen · öffnet morgen um 00:00 Uhr" at <Hero …>
[Vue warn]: Hydration class mismatch … bg-green-400 … expected bg-neutral-400
Hydration completed but contains mismatches.
```

## Fix

- `useStoreStatus`: `now` is `null` until the component is mounted, so the
  status is `null` on the server and during hydration for every consumer
  (hero, feature card, footer).
- Hero status line: on phones status and delivery time get one fixed row each
  (`grid-rows-[1.5rem_1.5rem]`); a long status is truncated instead of wrapping.
  The delivery time does not depend on the clock and is rendered on the server.
  From `sm` both share one row as before, and the delivery time waits for the
  status. Measured SSR vs hydrated at 360, 390 and 1280 px: status line height
  and the CTA position are identical.

## Open

- RUM verification (acceptance: < 1 % of sessions for 48 h) needs OpenObserve;
  on 2026-09-21 its host served only the Traefik default certificate.
- At 360 px the longest status ("öffnet Mittwoch, 23.09. um 17:30 Uhr") is
  truncated.
