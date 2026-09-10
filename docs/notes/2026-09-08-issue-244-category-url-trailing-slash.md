# Issue #244: `/c/fisch` returned 404, and aliases of a SEO URL redirect

Date: 2026-09-08, reduced to the remaining delta on 2026-09-10. Branch `fix/issue-244-seo-url-trailing-slash`.

## Re-verified (2026-09-08)

Live probe on pizzeria-lafattoria.de:

| URL          | Result                                    |
| ------------ | ----------------------------------------- |
| `/c/Extras/` | 200                                       |
| `/c/extras/` | 200 — lowercase already resolves          |
| `/c/Extras`  | **404** — correct case, no trailing slash |
| `/c/extras`  | **404**                                   |

Shopware only stores `c/Extras/` (with slash). Its `equals` filter on
`seoPathInfo` is case-insensitive (MySQL collation), so casing never was
the problem; the exact match simply failed without the slash.

OpenObserve (`_rumdata`): 0 category 404s in the last 7 days, 17 in the
last 30 days, all slash-less, arriving as Applebot + Safari pairs
(Siri/Spotlight suggestions strip the slash and lowercase the path).

The 301 that `/c/fisch` already got in production does not come from this
repository (probably a hosting rule).

## History

The original PR (#284, 2026-09-08) fixed the slash in a project copy of
`useNavigationSearch` and added `useSeoUrlRoute`. Before it was merged, #291
reported the same 404 and #293 fixed it on `main` with `resolveSeoPath` +
`useSeoUrlRoute`, without shadowing the layer composable (see the typecheck
note of #277 on why a project composable must not share a layer name).
#284 was then reduced to what `main` still lacked.

## Fix (delta on top of #293)

- `resolveSeoPath` now also returns a `redirectPath` for an **exact** match
  whose SEO path differs from the visited path. `useSeoUrlRoute` answers
  with a 301 (query preserved), so `/c/fisch/`, `/c/fisch` and `/c/FISCH`
  all land on `/c/Fisch/`. Paths are compared decoded, because the router
  encodes `route.path`.
- Records without a SEO path (the helpers' fallback for technical routes)
  are served as before.
- A technical `/navigation/<id>` path would resolve to its SEO URL record
  and redirect the same way, but no page routes it today: it hits the
  content catch-all `[...all].vue` and returns 404 (verified live, and
  unchanged by this PR). The catch-all fallback planned in #289 will route
  it.
- Tests: `test/unit/seoPath.spec.ts` (casing, encoding, technical path),
  `test/nuxt/useSeoUrlRoute.test.ts` (ported from #284: no redirect on the
  SEO URL, 301 for an alias, 404, history-state shortcut).

## Verification

Production build against the La Fattoria Store API: `/c/Fisch/` 200,
`/c/fisch/`, `/c/fisch`, `/c/FISCH` and `/c/Pizza` → 301 to the SEO URL,
`/c/Fisch?properties=x` → 301 `/c/Fisch/?properties=x`, unknown paths 404.
Playwright: direct load, link navigation, client-side redirect and back
button work without hydration warnings.

## Still not covered

Non-canonical SEO URLs (`isCanonical: false`, old paths after a rename)
are served under their old path instead of redirected to the canonical one.
