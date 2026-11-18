# Dependency update — 2026-11-18

Branch `deps-2026-11-18`. Previous round:
`2026-09-21-dependency-update.md`.

## Packages

Minor and patch updates of every direct dependency (one commit), then each
major on its own:

| Package | From | To |
| --- | --- | --- |
| pnpm | 12.11.2 | 12.21.0 |
| nuxt | 4.6.2 | 4.6.4 |
| @nuxt/content | 3.16.2 | 3.17.0 |
| @shopware/api-client | 1.7.0 | 1.8.0 |
| @shopware/composables | 1.14.0 | 1.15.0 |
| @shopware/nuxt-module | 1.5.2 | 1.6.1 |
| eslint / typescript-eslint / vitest / prettier | | latest minor |
| happy-dom | 20.14.6 | 21.0.4 (major) |
| jsdom | 30.1.3 | 31.0.1 (major) |
| @nuxt/fonts | 0.14.0 | 1.2.0 (major) |
| @nuxtjs/sitemap | 8.6.2 | 9.1.0 (major) |
| @nuxtjs/robots | 6.2.4 | 7.0.2 (major) |
| nuxt-vitalizer | 3.0.0 | 4.0.0 (major) |
| @vite-pwa/nuxt | 1.1.1 | 2.0.1 (major) |
| Node (Docker image, CI) | 24 | 26 (LTS since 2026-10-28) |

Held back:

- **typescript 7**: typescript-eslint 8.73 still declares
  `typescript >=4.8.4 <6.1.0`, and TypeScript 7 (the Go compiler) ships no
  classic compiler API, which vue-tsc needs.
- **@nuxt/devtools-kit 4**: Nuxt 4.6 depends on `@nuxt/devtools` 3, and
  `@nuxt/eslint`, `@nuxt/hints` and `@nuxt/test-utils` require the kit `^3`.
  The kit is only listed to satisfy those peers.
- **pnpm 12.22.0, @vite-pwa/nuxt 2.0.2**: younger than `minimumReleaseAge`.

## What needed changes

### @shopware/nuxt-module 1.6: patch gone

The plugin imports `ShopwareNuxtOptions` from `@shopware/nuxt-module`
instead of the unshipped `./src`, so `patches/` and `patchedDependencies`
are gone, and `node.dockerfile` no longer copies `patches/`.

### Prettier 3.10

Inline elements followed by punctuation stay on one line; four templates
were reformatted, the rendered text is unchanged.

### @nuxt/fonts 1

Fonts are Vite build assets under `/_nuxt/fonts/` (was `/_fonts/`), so they
get the immutable cache of `/_nuxt/`. `throwOnError` now defaults to `true`:
a production build fails when Google Fonts cannot be reached. The theme
module pins the weights of every family, so the new `400 700` default
weight range does not add faces.

### Nuxt SEO v6 (sitemap 9, robots 7, site config 5)

The three move together. Server functions and Nitro hooks take the
portable `RequestEvent` of `nuxt/server` instead of h3's `H3Event`:

- `server/routes/llms.txt.ts` uses `defineEventHandler` from
  `nuxt/server`. On Nitro 2 only such handlers get the web-standard event
  (`event.url`, `event.req.headers`) that `getPathRobotConfig()` reads; an
  h3 handler's `event.req` is the Node request and the call would throw.
- The `robots:config` and `site-config:init` hooks call `useRuntimeConfig()`
  without the event.
- The module types bring Nitro's typed `$fetch` into the server program;
  `storeApiPost`/`storeApiGet` assert their generic response type.

`robots.txt` was compared before and after, for `NUXT_SITE_INDEXABLE=true`
and `false`: byte-identical. Site Config 5 warns at build time that no site
URL is set for prerendering; only the Nuxt Content dumps are prerendered and
the URL comes from `storeUrl` at runtime, so the warning is harmless.
`pnpm peers check` lists `zod ^4.6.5` (optional peer of sitemap and robots
for `defineSitemapSchema()`); `content.config.ts` passes the `z` of Nuxt
Content, so the peer is not used.

### nuxt-vitalizer 4

Removes `disableStylesheets` (unused here); the defaults are unchanged.

### @vite-pwa/nuxt 2

Built on unplugin-pwa instead of vite-plugin-pwa:

- `workbox` is deprecated, the same settings now live under `generateSW`.
- The `VitePwaManifest` component no longer exists: `app.vue` renders
  `NuxtPwaManifest`. An unknown component only warns at runtime, so
  without the rename the manifest link would silently disappear.
- The module adds a `**/_payload.json` precache pattern whenever something
  is prerendered (the Nuxt Content dumps). No page payload exists, and an
  empty pattern now fails the build: `globStrict: false` restores the
  warning of 1.x. `cleanupOutdatedCaches` is no longer on by default and
  is set explicitly.

The service worker precaches the same files as before, the web manifest is
byte-identical.

### Node 26

Node 26 is LTS since 2026-10-28 and no longer bundles corepack:
`node.dockerfile` installs pnpm with `npm install -g`. CI sets up pnpm with
`pnpm/action-setup`, which does not need corepack.

## Checks

After every step: eslint, prettier, typecheck, unit tests, `pnpm build` and
`pnpm nuxt build test/layer`. At the end, the quickstart storefront was
built against this branch as its layer (Node 26) and ran in the
quickstart stack: the smoke test passed (start page, menu section, pizza
with an extra, guest checkout, contact form, both mails), and the manifest
link, `/sw.js`, `/robots.txt`, `/sitemap.xml` (category URLs keep their
trailing slash) and `/llms.txt` (`text/markdown`, content pages listed)
answered as expected.
