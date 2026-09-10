# Issue #274: Sitemap, canonical, og:image, title template

As of 2026-09-10, branch `feature/274-seo-sitemap-canonical-og`.

## Starting point (live, pizzeria-lafattoria.de)

- `/sitemap.xml` 404, robots.txt without `Sitemap:`.
- Home page: no canonical, no `og:image`, `twitter:card: summary`.
- Categories (`/c/Pizza/`) already had canonical, og:image and JSON-LD via `useCategorySeo`. The claim in the issue that categories have no URLs of their own was wrong.
- Products have no page. Shopware still generates 390 SEO URLs (`/Pizza-Margherita/21`) that return 404.
- `nuxt.config.ts` set `og:title` to the description (bug, fixed).

## Decisions (agreed with Lirim)

- Scope: only sitemap, canonical, og:image, title template. Product pages → #289, footer with address/phone/opening hours → #290.
- Product URLs later via catch-all fallback in `[...all].vue` (recorded in #289).
- og:image: static image via `site.ogImage`, no `nuxt-og-image`.
- City/cuisine (and later address, phone) via `runtimeConfig.public.site`, not via the plugin config.

## Implementation

- `@nuxtjs/sitemap` 8.5; sources: `/`, content pages (`defineSitemapSchema` in `landingpages`), `server/api/__sitemap__/urls.get.ts` (navigation `main-navigation` + menu category tree, flat via `buildTree: false`, otherwise subcategories are missing). App sources `nuxt:pages` and `nuxt:route-rules` are excluded (account/checkout, route rules like `/registrierung/bestaetigen`).
- `server/plugins/site-url.ts`: `storeUrl` becomes the nuxt-site-config URL so canonical, sitemap and robots.txt share one base (otherwise the request origin, which is internal behind a proxy).
- `app.vue`: title template (function, `%s`/`%siteName`), canonical from `route.path` (key `canonical`, categories override it with the SEO URL), `og:url`, `og:locale` from the session context, fallback `og:image`, `summary_large_image`.
- Page titles without the shop-name suffix; every page has its own title. `error.vue` keeps `404 | <shop name>` because `app.vue` is not rendered for error pages (no template).
- `usePageSeo` for the home page and content pages.

## Pitfalls

- **Trailing slash:** `@nuxtjs/sitemap` strips the trailing slash from every URL in `preNormalizeEntry` and only re-adds it globally via `site.trailingSlash`. Shopware category URLs (`/c/Pizza/`) return 404 without the slash (verified live), product URLs (`/Pizza-Margherita/21`) have none. A global `trailingSlash` therefore never fits. Solution: the source marks `_trailingSlash: true`, `server/plugins/sitemap-trailing-slash.ts` collects the paths in `sitemap:resolved` (per request in `event.context`) and re-appends the slash in `sitemap:output`. The 404 for the slashless URL is tracked as #291.
- For the same reason `toAbsoluteUrl` builds canonicals with `joinURL` instead of `createSitePathResolver`, which normalises slashes according to `site.trailingSlash`.
- **Nuxt Content** fills `seo.title`/`seo.description` automatically with `title`/`description`. A custom SEO title of the home page is therefore only detectable when it differs from `title`; otherwise `buildHomeTitle` applies.
- `@nuxtjs/sitemap` must come before `@nuxt/content` in `modules`; Content v3 needs the `sitemap` schema field per collection.
- nuxt-site-config reads all of `runtimeConfig.public.site` into its stack; the extra keys (`titleTemplate`, `ogImage`, `cuisine`, `address`) do no harm.

## Verification

Production build locally against the La Fattoria Shopware (Store API, public access key) with `NUXT_PUBLIC_STORE_URL=https://www.pizzeria-lafattoria.de`:

- robots.txt: `Sitemap: https://www.pizzeria-lafattoria.de/sitemap.xml`
- `/sitemap.xml` 200: home page, content pages, categories incl. subcategories with `/`, lastmod, category images
- Home page, `/c/Pizza/`, `/c/Nudeln/Penne/`, `/agb`, `/anmelden`, `/bestellung/warenkorb`: exactly one absolute canonical and one absolute `og:image` each, individual title

## After the release for Pizzeria La Fattoria

- Set `NUXT_PUBLIC_SITE_ADDRESS_CITY=Obertshausen`, `NUXT_PUBLIC_SITE_CUISINE`.
- Remove `seo.title`/`seo.description` in `content/index.yml` or fill them with search terms (currently "Pizzeria La Fattoria Obertshausen", which takes precedence over the new default).
- `public/card.png` exists; check it is 1200 × 630 px. Run the Facebook Sharing Debugger.
- The `robots.disallow` for `/impressum`, `/datenschutz`, `/agb` keeps those pages out of the sitemap.
