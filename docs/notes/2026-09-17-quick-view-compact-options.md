# Quick view: compact options and extras

The product quick view (`Product/QuickView.vue` → `Product/Detail.vue`) needed
a lot of scrolling for products with many extras. Measured on the demo shop
(Pizza Romana: 2 sizes, 8 extras, 6 ingredients, 390×844 viewport) the drawer
body was 775 px high with 598 px visible. Menus imported from Lieferando often
have 20–40 extras per product.

## Causes

- The ingredients were listed three times: in the description, as chips at the
  top of the body and again as the "Ohne" buttons at the bottom.
- Every extra was a pill with label and price. The pills were wider than half
  the drawer, so each one took a full row (~47 px).
- After scrolling, the customer no longer saw what they had chosen.

## Changes

- The body shows only the diet badges at the top. Ingredients are listed once,
  in the deselectable "Zutaten" section (`DeselectIngredient.vue`), placed
  before the extras.
- `CrossSelling.vue`: every cross-selling group is a collapsible section whose
  header summarises the selection ("2 gewählt · +2,10 €"). Only the first group
  starts open. Extras are checkbox rows with the price right-aligned. A group
  with more than 8 entries shows the first 6 plus "Alle N anzeigen", and more
  than 15 entries add a search field.
- `Detail.vue` fills the drawer body, so the add-to-cart button sits at the
  bottom of the desktop side panel.

Result on the demo product: 681 px body height (was 775). With 24 extras and a
second group (mocked response) the body is 727 px, and 1490 px once all 24
extras are shown.

## No height jumps

The phone drawer is as high as its content (up to 92vh), so anything that
changes the content height while choosing makes it jump:

- A first version showed a summary line above the button ("+ Extra Käse ·
  ohne Salami"). It appeared with the first choice and grew the drawer by
  31 px. It was removed; the choices stay visible in the ingredient chips and
  in the extras group header.
- Deselected ingredient chips used to gain an X icon, which made the chip wider
  and could wrap the row. Both states now carry an icon of the same size (X to
  remove, plus to add back).

Checked on the production menu of La Fattoria (12 pizzas with up to 34 extras, 360
and 390 px wide): toggling every ingredient and ticking an extra keeps the
drawer height constant.

## Performance and hydration

Measured against a `main` build with the same settings:

- JS on the first load of `/speisekarte/`: unchanged (326.6 KB gzip both).
- Entry CSS: +114 B gzip (UCheckbox theme).
- Quick view chunk loaded when the drawer opens: +2.4 KB raw (~0.9 KB gzip).
- Only the first 6 extras of a long group are rendered initially.

Opening `/speisekarte/?produkt=LF-27` directly reports the same two hydration
mismatches on `main` and on this branch (built with `debug.hydration`): the
`useId`-based id of the account dropdown in the header and a fragment node.
They are not caused by the quick view changes.
