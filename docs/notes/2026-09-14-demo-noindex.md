# Demo shop not indexable

Date: 2026-09-14. Branch `feature/demo-noindex`.

## Goal

This repository is the base layer of every production shop, but deployed as
the app it only runs as the ShopBite demo shop (demo.shopbite.de). The demo
must not be crawled. Before the change the live demo answered with
`X-Robots-Tag: index, follow, …` and an indexable robots.txt with a sitemap.

## Decision

The demo deployment (Dokploy) sets `NUXT_SITE_INDEXABLE=false`. Nothing in
`nuxt.config.ts`:

- An unconditional `site: { indexable: false }` would be merged into every shop
  project. Pizzeria La Fattoria does not set `site.indexable`, so it would drop
  out of search engines with the next release.
- A config flag limited to this repository as the root project (comparing
  `process.cwd()` with the config directory) worked, but was rejected as too
  much machinery for one deployment setting.
- nuxt-site-config reads `NUXT_SITE_INDEXABLE` at runtime (priority `runtime`),
  so no rebuild is needed. The trade-off: the setting lives in the deployment,
  not in the repository; without it the demo is indexable again.

With `indexable: false`, @nuxtjs/robots serves `Disallow: /` in robots.txt (no
sitemap entry), `X-Robots-Tag: noindex, nofollow` and the robots meta tag.

## Category pages

`useCategorySeo` set `robots: "index,follow"` for active categories. The page
meta replaced the module's tag, so category pages rendered `index,follow` next
to a noindex header on a non-indexable site, and production shops lost the
module's `max-image-preview:large` rule. The composable now only sets
`noindex,nofollow` for inactive categories and leaves the rest to the module.

## Verified

Production build with La Fattoria's Store API, `node .output/server/index.mjs`:

- `NUXT_SITE_INDEXABLE=false`: robots.txt `Disallow: /`; `/`, `/c/Pizza/` and
  `/bestellung/warenkorb` send `X-Robots-Tag: noindex, nofollow` and render
  `<meta name="robots" content="noindex, nofollow">`.
- Without the variable (production shop): robots.txt with the disallow list
  and sitemap, `/` and `/c/Pizza/` `index, follow, max-image-preview:large, …`
  in header and meta, `/bestellung/warenkorb` keeps its page-level
  `noindex, nofollow`.
- `pnpm vitest run test/unit/useCategorySeo.spec.ts`, ESLint, Prettier,
  `pnpm typecheck`.

## After merging

Set `NUXT_SITE_INDEXABLE=false` in the Dokploy environment of demo.shopbite.de
and redeploy. Pages Google has already indexed disappear slowly because
`Disallow: /` stops crawling before the noindex is seen; use the removal tool
in Google Search Console for a faster cleanup.
