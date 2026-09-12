# Issue #327: Home page hero and top sellers

As of 2026-09-12, branch `feature/327-home-hero` (stacked on
`feature/325-product-card`, it uses the product quick view).

## Decision

Canvas "Startseite Hero"
(https://claude.ai/code/artifact/a17d8c92-1897-467b-82b3-47155fe6f0f2):
A (order hero, photo with gradient, one action), B (compact banner with
button, top sellers and category tiles first), C (light editorial with the
photo as a card). Chosen: **A**, full-bleed (a rounded banner and a
flatpay.com-style near-full-height hero were tried and dropped), plus the
top sellers as a horizontal scroller.

## Changes

- `Hero.vue`: full-bleed photo/video (poster preload and the ≥768 px video
  rule of #273 unchanged) with a bottom-to-top gradient
  (`from-neutral-950/15 … to-neutral-950/85`) instead of the flat 50 %
  overlay; content bottom left inside the container width: USPs as a
  compact inline row, `headline` eyebrow, title, description, a live
  status line and the buttons. The first link is the single primary
  button (full width on phones), further links are ghost buttons in
  white.
- Status line: `useStoreStatus` ("Geöffnet bis 23:00" / "Geschlossen ·
  öffnet …", client only, #275) and `deliveryTime` from the plugin config;
  a `min-h-6` reserves the space before hydration (CLS 0.001).
- `hero.title` in the content schema (optional, falls back to the page
  title); the demo content sets "Frisch gekocht, schnell geliefert.".
  Existing shop content works unchanged.
- `Topseller.vue`: rendered on the home page directly below the hero
  (it was not mounted anywhere before). Horizontal snap scroller of
  `Product/CardCompact.vue` (cover or placeholder, number, name, price,
  plus; the card opens the quick view of #325), heading with a
  "Speisekarte" link, nothing without top sellers. Loaded with
  `useAsyncData`.
- `useTopSellers`: limit 8, includes for cover, properties and
  availability, and the `sw-inheritance` header so variants marked as top
  sellers carry the parent's name and cover (La Fattoria marks both the
  parent "Cordon Bleu" and its three variants; the header type of the
  generated operation lacks `sw-inheritance`, hence the `@ts-expect-error`).
- Homepage docs (`content/{de,en}/docs/8.storefront/3.content.md`)
  describe `hero.title`, the status line, the link order and the top
  sellers.

## Verification

- Production build with the La Fattoria API: status "Geöffnet bis 23:00",
  eight top sellers, a tap opens the quick view (`?produkt=18V`), video
  only at 1280 px; screenshots mobile light/dark and desktop reviewed, no
  page errors.
- Lighthouse mobile on `/`: the LCP element is still the poster image,
  CLS 0.001.
- Unit tests (`Hero.test.ts`, `useTopSellers.test.ts` unchanged and
  green), Prettier, ESLint, typecheck and build pass; the unit run still
  exits 1 because of #323.

## Follow-ups

- Products without a cover show a placeholder in the top seller row; a
  category icon per product would need the category association.
- The USP row still comes from `hero.usps`; a dedicated rating field
  (value, count, link) would render the Google rating with stars.
