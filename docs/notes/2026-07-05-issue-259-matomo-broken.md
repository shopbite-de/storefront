# Issue #259 — Matomo stopped tracking after v1.23.0

Date: 2026-07-05 · Branch: `fix/259-matomo-runtime-config`

## Symptom

Since release v1.23.0 no Matomo events arrive. Browser console:

> Loading failed for the `<script>` with source
> "https://cdn.matomo.cloud/undefined/matomo.js".

## Root cause: upstream regression in `@nuxt/scripts` 0.13.2 → 0.13.4

v1.23.0 was the first release since April and bumped `@nuxt/scripts`
0.13.2 → 0.13.4. That bump changed how `useRegistryScript` merges the
build-time registry options with `runtimeConfig.public.scripts.*`:

- **0.13.2:** `Object.assign(_userOptions, scriptConfig)` — runtime config
  **wins** over build-time options.
- **0.13.4:** `defu(_userOptions, scriptConfig)` — build-time options win
  for every **defined** value, and `""` is a defined value.

Our `nuxt.config.ts` configured the registry with placeholder values
(`matomoUrl: "", siteId: ""`), expecting the real values to arrive at
runtime via `NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*` env vars. The module
inlines the registry options verbatim into the generated `scripts:init`
plugin, so production ran
`useScriptMatomoAnalytics({matomoUrl:"",siteId:""})` — and with `defu`
those empty strings now shadow the runtime config. Empty `matomoUrl` makes
the registry fall back to the Matomo-cloud CDN URL with an undefined
`cloudId` → `https://cdn.matomo.cloud/undefined/matomo.js`.

Confirmed on production: the SSR payload contains the **correct** runtime
config (`matomoUrl:"https://analytics.veliu.net/"`), while the preload
link and script src use the undefined cloud URL — proving the values were
present but ignored.

Still present in `@nuxt/scripts` 1.3.0 (latest), so upgrading would not
have fixed it.

## Fix

Never put placeholder values in `scripts.registry` — they get baked into
the build and (since 0.13.4) beat the runtime config:

- `scripts.registry.matomoAnalytics: true` — enables the script, inlines
  `{}` so runtime config wins again.
- The keys live in `runtimeConfig.public.scripts.matomoAnalytics`
  explicitly, so Nuxt's env override
  (`NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_MATOMO_URL` / `_SITE_ID`) still
  has keys to land on. The module `defu`s its registry config into
  `runtimeConfig.public.scripts`, and our explicit object wins over
  `true`.

No deployment/env changes needed; the existing env vars are correct.

## Verification

Production build run locally with the env vars set: rendered HTML contains
`https://analytics.veliu.net/matomo.js` in the preload link and script
src; the `undefined` cloud URL is gone.

## Notes

- The same failure mode applies to any future registry script: use
  `true`/real values in `scripts.registry`, never `""` placeholders.
- Upstream issue candidate: `defu` in `useRegistryScript` silently
  prefers inlined build-time options (even empty strings) over
  `runtimeConfig.public.scripts.*` — arguably a regression vs 0.13.2.
