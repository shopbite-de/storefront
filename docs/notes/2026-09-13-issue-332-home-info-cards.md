# Issue #332: Information cards on the home page

As of 2026-09-13, branch `feature/332-home-info` (from `main`).

## Decision

Canvas "Alle Informationen"
(https://claude.ai/code/artifact/ed95c1eb-e63b-4692-9e7d-b09340a22f4d):
A (three cards with a bold lead, detail text and one action) vs. B
(compact three-row list with expandable details). Chosen: **A**.

## Changes

- `Feature/Card.vue`: tinted icon, category label (`title`), bold lead,
  detail (`description`), optional action (`link`; a `tel:` target is a
  subtle button with a phone icon, anything else a text link with an
  arrow). `kind: hours` fills the lead with today's intervals
  (`formatTodayHours` in `app/utils/openingHours.ts`, unit-tested) and
  shows the open/closed status from `useStoreStatus`; `kind: delivery`
  uses `deliveryTime` from the plugin config. Both live parts are
  `ClientOnly` with reserved height, like `Footer/StoreStatus.vue` (#275):
  business hours load on the client and the browser's clock decides.
- `Features.vue`: `UPageSection` with a 1/2/3-column grid of cards instead
  of the `features` prop; the decorative blur blobs sit behind the cards
  (`-z-10`, they were above them before).
- `content.config.ts`: optional `kind`, `lead` and `link` on the feature
  schema (also available to the Mittagstisch section, which ignores
  them); existing content renders as before, only as cards.
- `Footer/Contact.vue`: `id="oeffnungszeiten"` on the opening hours block
  so the hours card can link to it.
- Demo content: the three entries carry `kind`, the hours description
  keeps only the exceptions (Saturday, closed Tuesday), the reservation
  card gets a call button.
- Homepage docs (`content/{de,en}/docs/8.storefront/3.content.md`,
  branch `docs/storefront-info-cards` stacked on
  `docs/storefront-hero-title`).

## Verification

- Production build with the La Fattoria API: leads "Heute 11:30–14:30
  und 17:30–23:00", "In ca. 30 Minuten bei dir", "Tisch nur telefonisch";
  status "Geöffnet bis 14:30"; the hours link scrolls to
  `#oeffnungszeiten`; no page errors and no hydration warnings on 390 px
  light/dark and 1280 px.
- Unit tests (3 new for `formatTodayHours`), Prettier, ESLint, typecheck
  and build pass; the unit run still exits 1 because of #323.
