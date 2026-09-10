# Issue #291: SEO URLs with a missing or extra trailing slash

As of 2026-09-10, branch `fix/291-seo-url-trailing-slash`.

## Cause

`c/[...all].vue` and `speisekarte/[...all].vue` resolve the path via `useNavigationSearch().resolvePath`. That filters `/store-api/seo-url` exactly on `seoPathInfo`. Shopware stores category URLs with a trailing slash (`c/Pizza/`) and product URLs without (`Pizza-Margherita/21`). The fallback `getRouteFromPathInfo` from `@shopware/helpers` only handles technical paths (`/navigation/<id>`, `/detail/<id>`, ...) and returns `null` otherwise. Result: `/c/Pizza` → 404 (verified live).

## Solution

- `app/utils/seoPath.ts` → `resolveSeoPath(path, resolve)`: exact lookup; on a miss exactly one second lookup with the trailing slash toggled. Hits yield `redirectPath` from `seoPathInfo` (not the toggled path), so the redirect always targets the backend SEO URL. Hits without `seoPathInfo` (technical routes) do not count, `/` is not toggled.
- `app/composables/useSeoUrlRoute.ts` bundles resolution, 404 and `navigateTo(..., { redirectCode: 301, replace: true })` incl. query parameters. Both category pages use it; the product pages from #289 can reuse it for their URLs.
- The `useAsyncData` value now has the shape `{ seoUrl, redirectPath }` (key unchanged: `cmsResponse<path>`).
- On the side: removed a stray `H` before `<script>` in `speisekarte/[...all].vue`.

## Cost

Only paths that do not match exactly trigger a second Store API call (unknown paths from bots: 2 calls instead of 1, then 404).

## Not covered

- Non-canonical SEO URLs (old URLs after a rename, `isCanonical: false`) are still served instead of redirected to the canonical one.
- Technical URLs (`/navigation/<id>`) are not redirected to their SEO URL; `@shopware/helpers` offers `getCanonicalPathForTechnicalPath` for that.
