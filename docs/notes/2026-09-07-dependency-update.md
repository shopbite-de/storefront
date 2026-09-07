# Dependency update — 2026-09-07

Date: 2026-09-07 · Branch: `chore/updates`

All dependencies were bumped to their latest versions with two deliberate
exceptions (see "Held back"). Everything below is what broke, why, and how it
was fixed, so the next round of updates does not have to rediscover it.

## Major bumps

| Package | From | To |
| --- | --- | --- |
| nuxt | 4.4.8 | 4.5.2 |
| @unhead/vue | 2.1.15 | 3.4.0 (required by Nuxt 4.5) |
| @nuxt/scripts | 0.13.4 | 1.3.8 |
| @pinia/nuxt | 0.11.3 | 1.0.2 |
| nuxt-vitalizer | 2.0.0 | 3.0.0 |
| @nuxt/content | 3.12.0 | 3.16.0 |
| vitest / @vitest/ui | 4.1.10 | 5.0.0 |
| jsdom | 29 | 30 |
| uuid | 13 | 14 |
| @types/node | 25 | 26 |

Everything else was a minor or patch bump.

## Held back

- **typescript stays on 6.x.** `@typescript-eslint/*` 8.70 declares
  `typescript >=4.8.4 <6.1.0`, so TypeScript 7 (the Go compiler) is not usable
  until typescript-eslint supports it.
- **@nuxt/devtools-kit stays on 3.x.** Its npm `latest` tag currently points
  at `4.0.0-alpha.17`; `pnpm update --latest` would have installed an alpha.

## What broke and how it was fixed

### Nuxt 4.5: `$fetch` is now an auto-import

Nuxt 4.5 generates `#build/fetch.mjs` (`export const $fetch = globalThis.$fetch`)
and auto-imports `$fetch` from it. Composables therefore no longer read the
global at call time, and `vi.stubGlobal("$fetch", mock)` in tests silently
stops intercepting (the real fetch hits the h3 test server → 404s).

Fix: `mockNuxtImport("$fetch", () => mockFetch)` from
`@nuxt/test-utils/runtime` (see `test/nuxt/useCategoryListing.test.ts`,
`test/nuxt/useProductConfigurator.test.ts`).

### Nuxt UI 4.11: clicking the hidden checkbox input no longer toggles v-model

`UCheckbox` renders a `button[role="checkbox"]` plus an `aria-hidden` native
input that only mirrors state. Triggering `click` on that input used to flip
the model; now it only flips the input's own `checked`. Tests must click the
button (`acceptDataProtection()` helper in `test/nuxt/RegistrationForm.test.ts`).

### @nuxt/scripts 1.x: registry config

- `registry.matomoAnalytics: true` is deprecated. The 1.x equivalent is
  `{ trigger: "onNuxtReady" }` (that is exactly what `true` normalised to).
  Only `scriptOptions` is inlined into the build, so the #259 constraint
  (never inline `matomoUrl`/`siteId`, let runtime config win) still holds.
  Verified on a production build with env vars set: the payload contains
  `matomoUrl:"https://analytics.veliu.net/"` and `siteId:3`, and the preload
  points at `https://analytics.veliu.net/matomo.js`.
- Build-time warning
  `env var NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_SITE_ID does not match any option`
  is a false positive: the module's own env-var validator only knows the
  fields in its `envDefaults` (for Matomo just `matomoUrl`). Nuxt's generic
  runtime-config env override still applies because `siteId` is declared in
  `runtimeConfig.public.scripts.matomoAnalytics`. Safe to ignore.

### unhead 3: `children` → `innerHTML`

`children` on head script entries is deprecated (still rendered, but the type
now requires `innerHTML`/`textContent`). `Category/Breadcrumb.vue` switched to
`innerHTML`, matching `useCategorySeo`.

### eslint-plugin-vue 10.11: comments at the template root

`vue/no-multiple-template-root` now flags an HTML comment placed before the
root element. The comment in `pages/bestellung/[id]/index.vue` moved inside
the element.

### `pnpm typecheck` was not runnable at all

- `vue-tsc` was never a devDependency, so the script bailed out immediately.
  It is now a devDependency (pinned to the `@vue/typescript-plugin` version).
- `tsconfig.json` had a trailing comma that the newer `@nuxt/cli` (fetched by
  `pnpx`) rejects. Removed.

With those fixed, typecheck runs but still reports errors that pre-date this
update (typecheck is not part of CI): 7 in test files and the Shopware layer
sources, tracked in #248. New since the update, all inside third-party layer
sources we cannot fix here:

- `@shopware/nuxt-module/plugin.ts`: `declare module "#app" { interface NuxtApp }`
  augmentation now trips "Type 'NuxtApp' recursively references itself" with
  Nuxt 4.5's `interface NuxtApp extends _NuxtApp`. The file is unchanged
  between 1.5.0 and 1.5.1, so this is a Nuxt 4.5 + Shopware module issue.
- `@shopware/composables` 1.12.1 `useCartItem.ts`: new `as LineItemPayloadWithOptions`
  cast rejected by TS2352.

Conversely, 7 `@click` handler type errors (handlers returning non-void) in our
components disappeared with Nuxt UI 4.11.

## Verification performed

- `pnpm test:unit`: 25 files / 132 tests green (same count as before).
- `pnpm eslint`, `pnpm prettier`: clean.
- `pnpm build`: green.
- `pnpm test:e2e` (not in CI, commented out there): passes against the
  production build served with `.env.test` on port 3005. Playwright 1.63 needs
  `pnpm playwright install chromium` (headless shell build 1243).
- Production server smoke test: `/` and `/speisekarte/pizza/` render, JSON-LD
  scripts (category + breadcrumb) present, Matomo config correct.
