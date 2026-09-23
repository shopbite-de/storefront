# Issue #388: Menu tiles and a dish grid instead of the product sliders

As of 2026-09-23, branch `feat/388-home-sections`.

## Why

The home page below the hero was two product sliders in a row with the
same pictures: the top seller scroller (`Topseller.vue`, #327) and the
marquee (`Food/Marquee.vue`, one product request per item while rendering,
hand-maintained `productId`/`image` pairs in the content). Visitors could
not get from the hero into the menu. The automatically generated lead
demos (`leads/demo_create.py` in the monorepo) made the sameness obvious.

## Changes

- `Home/MenuCategories.vue`: the children of the menu root (`menuCategoryId`,
  else the navigation root) as tiles with the category photo
  (`category.media`, set on the category in the Shopware admin) or the
  section icon (`shopbite_category_icon`) on the brand gradient, name and
  arrow, linking to the listing. `readNavigation` with `depth: 1` and an
  `includes` projection as POST body (#312). Up to `limit` (8) tiles, then
  one "Alle Kategorien" tile. Renders nothing without sections.
- `Home/Highlights.vue`: the top sellers from `useTopSellers` as a grid of
  the regular `ProductCard` (quick view via `useProductQuickView`, #325),
  1/2/4 columns. Renders nothing without top sellers.
- `pages/index.vue`: hero, menu tiles, highlights, features, optional
  Mittagstisch, gallery (only with images), CTA. `Topseller.vue`,
  `Food/Marquee.vue` and `Food/MarqueeItem.vue` are deleted.
- Content schema: `marquee` removed, `menu` and `highlights` (headline,
  title, description; all optional, German defaults in the components),
  `gallery` optional. Existing `index.yml` files keep working; an old
  `marquee` block is ignored by Zod.
- Homepage docs (`content/{de,en}/docs/8.storefront/3.content.md`).

## Verification

- `HomeMenuCategories.test.ts`: tiles with photo/icon, cap and "all" tile,
  empty state. Prettier, ESLint, typecheck and the unit suite pass.
- Production build against a lead demo channel (Da Piero): tiles show the
  category photos, the grid the eight top sellers, quick view opens.

## Follow-ups

- Category photos need a media on the category; `demo_create.py` sets the
  first dish photo of each section, real shops set it in the admin.
