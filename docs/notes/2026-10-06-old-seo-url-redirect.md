# Old category SEO URLs redirect to the current ones

As of 2026-10-06, branch `feature/redirect-non-canonical-seo-urls`. Prompted by La Fattoria moving its category URLs from `/c/Pizza/` to `/speisekarte/pizza/` via the Shopware SEO URL template.

## Findings (La Fattoria Store API)

- Shopware keeps the old SEO URL of an entity when the template or the entity name changes: same `foreignKey`, `isCanonical: null`. La Fattoria has 262 of them for products already (e.g. `Schnitzel-Wiener-Art/103V` next to the canonical `Schnitzel-Wiener-Art/103`).
- The Store API `/seo-url` route adds `isCanonical = true` to the criteria unless they contain an `equals` filter on `isCanonical` at top level (a nested `multi` filter does not count). A lookup by `seoPathInfo` alone therefore never finds an old URL: before this change, every old category URL returned 404 after a template change.

## Change

- `resolveSeoPath` takes an optional `resolveOld`. It is asked only after the canonical lookup missed with and without the trailing slash, again for both variants, so known paths cost no extra request.
- `useSeoUrlRoute` implements it as two Store API calls: the old record (`seoPathInfo` + `isCanonical: null`), then the canonical record of the same `foreignKey`, `routeName` and `languageId`. A match redirects with 301 (query kept); an old URL without a current one (deleted category) stays 404.
- Up to four lookups for unknown paths below `/c/` and `/speisekarte/` (previously two). Other unknown paths go to the content catch-all and are unaffected.

## Verification

Unit tests (`seoPath.spec.ts`, `useSeoUrlRoute.test.ts`), typecheck, ESLint, Prettier. Both queries checked against the La Fattoria Store API with existing old product URLs: the `seoPathInfo` lookup without an `isCanonical` filter returns nothing, with `isCanonical: null` it returns the old record, and the canonical lookup returns `Schnitzel-Wiener-Art/103`.
