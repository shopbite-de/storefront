# Issue #402: /llms.txt

As of 2026-10-05, branch `feature/402-llms-txt`. Part of the AI visibility issues #400–#404.

## Implementation

- `server/routes/llms.txt.ts` gathers the data, `server/utils/llmsTxt.ts` builds the Markdown (pure, unit-tested). The route lives in the layer, so every shop extending the storefront gets it.
- Sources: `runtimeConfig.public.site` (name, description, address, phone, cuisine, delivery areas from #401), the ShopBite plugin routes (business hours, holidays, config: checkout enabled, delivery time), `/context` (currency), the menu navigation (`menuCategoryId`, with SEO URLs) and all main products via `/product` (100 per page, at most 10 pages, `includes` in the POST body, #312). Each source is optional: `Promise.allSettled`, a failed request drops its section.
- Products are grouped by their directly assigned `categoryIds` (extras without category are not listed). Products with variants show "ab <cheapest price>". Ingredients and diets reuse `getMainIngredients`/`getDiets` (#400).
- Sorting: the `/product` route ignored `sort` by name, so items are sorted in code (German locale, numeric).
- Content pages come from the `landingpages` collection; pages that `robots.txt` blocks (La Fattoria's legal pages) are filtered with `getPathRobotConfig`.
- `swr: 3600` route rule. On non-indexable sites the robots module already sends `X-Robots-Tag: noindex, nofollow` for this route, so no own header is needed.
- `splitList` moved to `app/utils/seo.ts` (shared with `useRestaurantSchema`).

## Verification

Production build against the demo backend: `/llms.txt` 200, `text/markdown; charset=utf-8`, 120 lines / 5 KB with 9 menu sections, "ab" prices for pizzas, ingredients and diets; with `NUXT_SITE_INDEXABLE=false` the response carries `X-Robots-Tag: noindex, nofollow`. Unit + nuxt tests, typecheck, ESLint green.
