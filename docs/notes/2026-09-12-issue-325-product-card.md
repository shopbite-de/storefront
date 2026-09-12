# Issue #325: Product card redesign

As of 2026-09-12, branch `feature/325-product-card`.

## Decision

Design canvas "Produktkarten Varianten"
(https://claude.ai/code/artifact/95cc5132-1515-477f-af62-3afa79d0ee3c):
three directions (A compact with thumbnail, B dense menu list, C visual
with a large image), then three derivatives of C for shops without
product photos, then five levels of button emphasis. Chosen: **C1** (the
anatomy of C, the image block only when the product has a cover) with
button level **B1** (`variant="subtle"`). La Fattoria has no product
covers at all, the ShopBite demo a few, so the card must look finished
without any image.

## Changes

Second iteration (same day): the card carries no buttons at all. The
whole card is the control (`role="button"`, keyboard, hover ring) and opens
a product quick view, the "micro PDP" the customer asked for.

- `Product/Card.vue`: an `article` with `ring ring-default rounded-xl
  shadow-md`, the cover as `h-44 object-cover` on top with the diet badge
  as overlay, the wishlist button top right (a `@click.stop` wrapper keeps
  it from opening the quick view), number (primary, `text-xs`), name
  (`text-lg font-bold`), description, price on the right with either
  "Ausverkauft" (`available === false`) or a "n× im Warenkorb" hint
  (`useProductCartQuantity`), and the main ingredients as chips
  (`Product/CardIngredients.vue`, replaces `CardDescription.vue`;
  `CardDietBadges` got a `variant` prop). `selectable` (replaces
  `withAddToCartButton`) emits `select`; the top sellers on the home page
  are not selectable.
- `useProductQuickView(products)`: the open product is the `produkt`
  query parameter (product number, e.g. `/c/Pizza/?produkt=22`). Opening
  pushes a history entry, so the back button closes the drawer; closing
  replaces the URL. A direct load with the parameter opens the drawer once
  the listing holds the product. One drawer per listing (category page,
  search page incl. fallback suggestions, `Product/Category.vue`), created
  on first use.
- `Product/QuickView.vue`: `UDrawer` as bottom sheet on phones and side
  panel from `lg` (`useMediaQuery`), title = number + name, description,
  ingredient chips, then `Product/Detail.vue`. Only the body scrolls
  (`container: overflow-hidden`, `body: min-h-0 overflow-y-auto`), so the
  title stays visible above 34 extras chips; the header needs `shrink-0`
  or the flex column squeezes it to its `min-h-8`. The button says
  "Hinzufügen" plus the total (`aria-label` "In den Warenkorb"): the long
  label wrapped to two lines next to the stepper on phones.
- `Product/Detail.vue`: variants (`Configurator`, unchanged select), extras
  as toggle chips with surcharge (`CrossSelling.vue`, replaces the
  `UInputMenu`), "Ohne" chips with line-through for the ingredient
  deselection (`DeselectIngredient.vue`, replaces the `USelect`), and a
  sticky footer with the quantity stepper and the button that shows the
  total (unit price plus extras, times quantity; `AssociationItemProduct`
  carries `unitPrice` for that). Skeleton while the detail loads.
- `Cart/Bar.vue` (mounted in `app.vue`): sticky bar at the bottom on
  phones (`lg:hidden`) as soon as the cart holds something, "Warenkorb ·
  n Artikel · subtotal", opens the cart drawer. `useCartQuickView` holds
  the drawer state (`useState`) so the header button and the bar share it.
  Hidden under `/bestellung`; a spacer keeps the footer clear; the cart is
  loaded on the client, so the bar never renders on the server. Adding a
  product pops the bar (`--animate-cart-pop` in `main.css`, re-triggered
  by re-keying the button) and shows "2× Pizza Salami hinzugefügt" for
  1.8 s before the count and subtotal return; the header cart badge pops
  as well. This replaces the add-to-cart toast: `useAddToCart` now emits
  `triggerCartItemAdded(product, quantity)` (`useProductEvents`,
  `onCartItemAdded`) instead of calling `useToast`.
- Listing and search routes add `available` to the projection.
- `AddToWishlist.vue` takes `size` and `variant` and an `aria-label`.
- Category listing, search page and `Product/Category.vue` render two
  columns from `xl`; `CardSkeleton.vue` follows the new anatomy.
- The e2e helper opens the quick view from the card, checks the URL
  parameter, sets the quantity and adds from the drawer.

`productHasOptions` (variants or cross-sellings) from the first iteration
is gone with the direct add-to-cart; the listing projection no longer
loads cross-sellings.

## Verification

- Production build with the La Fattoria API: tapping a pizza card sets
  `?produkt=22` and opens the sheet with 34 extras chips and the "Ohne"
  chip; one extra plus quantity 2 puts 17,00 € into the cart and the card
  shows "2× im Warenkorb"; the back button closes the sheet;
  `/c/Pizza/?produkt=30` opens the side panel on desktop directly; the
  search page opens it from a result. A drink without extras shows only
  the quantity and the button. After adding, the cart bar reads
  "2 Artikel · 7,00 €", opens the cart drawer, and is absent on
  `/bestellung/warenkorb` and at 1280 px. Screenshots mobile light/dark and desktop
  reviewed, no page errors.
- Unit tests, Prettier, ESLint, typecheck and build pass. The unit run
  still exits 1 because of #323.
- Lighthouse (first iteration, still valid as an upper bound: the card
  now hydrates fewer components): within the run-to-run spread of `main`
  on this machine; CDP CPU profiles of both builds equal within 5 %.

## Follow-ups (not in this issue)

- The quick view URL only resolves products of the current listing; a
  `?produkt=` on a page that does not list the product is ignored.
