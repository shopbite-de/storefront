# Issue #289: product deep links instead of product pages

As of 2026-10-05, branch `feature/289-product-deep-links`. Scope changed with Lirim: no product detail pages (a restaurant product is name, description, price: thin content next to the category page). The quick view deep link `/<category>/?produkt=<number>` is the product URL; its source of truth is the product SEO URL in Shopware, set by the ShopBite plugin (shopware-plugin#28).

## Shopware SEO URL template

Lirim's template, verified on the demo (preview API and after indexing):

```twig
{% set main = product.mainCategories|first %}{% set cat = main ? main.category : product.categories|first %}{% for p in (cat.translated.breadcrumb ?? [])|slice(1) %}{{ p }}/{% endfor %}?produkt={{ product.productNumber|url_encode|raw }}
```

- `slice(1)` matches the demo's category template (`category.seoBreadcrumb` → `Speisekarte/Pizza/`, incl. slugs such as `Getraenke`); `slice(2)` gives `Pizza/…`, which does not exist. Shops with a prefixed category template (La Fattoria `c/…`) need the prefix: the plugin derives it.
- The product number must be `|url_encode|raw`: the SEO escaper slugifies variables, `LF-21-groß` became `LF-21-gross`, which the quick view cannot find. Encoded it is `LF-21-gro%C3%9F`, which the router decodes.
- `seoBreadcrumb`/`seoCategory` are not available in the product template; the preview API renders main products only, so variants are only visible after indexing.
- **The demo backend now runs this template** (set via Admin API for verification, both `frontend.detail.page` and `store-api.product.detail`, reindexed).

## Implementation

- `app/utils/productUrl.ts`: `productDeepLink(product, categoryPath?)` takes the canonical product SEO URL if its query has `produkt`, otherwise category SEO URL + `?produkt=<number>`; `PRODUCT_QUICK_VIEW_PARAM` moved there.
- Listing (`server/api/listing`), top sellers and `/llms.txt` request `seoUrls` (`seo_url: seoPathInfo, isCanonical`, header `sw-include-seo-urls`).
- `MenuItem.url` in the category schema, dish links in `/llms.txt`.
- Product card: with `href`, the name is an `<a>` stretched over the card (`after:absolute after:inset-0`); the article drops `role="button"`/tabindex, the focus ring moves to `has-[a:focus-visible]`. A plain click is prevented and bubbles to the card's `select` (quick view in place, no page load); a modified click opens the link. The wishlist button got `z-10` to stay above the stretched link. Without `href` (e.g. search) the card behaves as before. Top seller cards link only when the product SEO URL is a deep link (no category known on the home page).
- `useProductQuickView`: a number that is not in the list is loaded in the browser (`readProduct`, `sw-inheritance`), and the quick view opens with it; `ProductDetail` loads the variant id, whose configurator preselects its options.

## Verification

Production build against the demo: card `<a href>`s, `MenuItem.url` and `/llms.txt` links (fallback URLs before the template change, SEO URLs after). Playwright on mobile: card click opens the quick view without a page load; Enter on the focused link opens it; Ctrl+click opens a new tab without the quick view; the wishlist button stays clickable; `?produkt=LF-21-gro%C3%9F` opens "Pizza Margherita" with "Groß 40 cm" selected; no console errors. Card look unchanged (link inherits colour, no underline). All unit + nuxt tests, typecheck, ESLint green.
