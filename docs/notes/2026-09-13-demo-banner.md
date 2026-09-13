# Demo banner

Date: 2026-09-13. Branch `feature/demo-banner`.

## Goal

Demo shops in `demos/` look like real shops. A prospect (or a visitor who
finds the demo URL) must not mistake them for a live shop, so the
storefront shows a notice above the header when the feature flag
`shopBite.feature.demoBanner` (`NUXT_PUBLIC_SHOP_BITE_FEATURE_DEMO_BANNER`)
is set.

## Implementation

- `components/DemoBanner.vue` renders Nuxt UI's `UBanner` (`color="warning"`)
  with a fixed German notice. It has no `close` and no `id`, so it cannot be
  dismissed and nothing is persisted in `localStorage`.
- `app.vue` mounts it as `LazyDemoBanner v-if="shopBite.feature.demoBanner"`
  above `Header`, so real shops do not ship the `UBanner` chunk (#314). The
  banner is part of the SSR HTML and scrolls away; `UHeader` stays sticky.
- `UBanner` is found by `ui.experimental.componentDetection` because the
  component file lives in the project layer (#319).
- Both demo shops set `runtimeConfig.public.shopBite.feature.demoBanner: true`
  in their `nuxt.config.ts`. They consume the published `@shopbite-de/storefront`
  package, so the banner appears there after the next release.

## Verified

- `pnpm vitest run test/nuxt/DemoBanner.test.ts`, `pnpm eslint`, `pnpm typecheck`.
- `NUXT_PUBLIC_SHOP_BITE_FEATURE_DEMO_BANNER=true pnpm dev`: the notice is in
  the server-rendered HTML of `/` before the header; without the flag it is
  absent.
