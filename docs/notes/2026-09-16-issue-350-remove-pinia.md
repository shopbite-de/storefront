# Remove Pinia

Date: 2026-09-16. Branch `feature/350-remove-pinia`, issue #350.

## Why

#348 (#339) removed the only store, `useCheckoutStore`: the checkout stepper
derives its step from the route. Shared state is `useState`/`useAsyncData` in
composables everywhere else. `@shopware/composables`, `@shopware/nuxt-module`
and the demo shops (`demos/`, `masala-mio/`) do not use Pinia.

## Changes

- `@pinia/nuxt` removed from `package.json` and `modules`, `pinia` removed from
  the `framework` code splitting group in `nuxt.config.ts`.
- `README.md` project structure: no `stores/` directory.
- Monorepo `CLAUDE.md` (not versioned): "Pinia for state" replaced.

`pinia` stays in `pnpm-lock.yaml` as an optional peer dependency of
`vue-router` and `@sentry/vue`; neither installs nor bundles it for us.

Shops extending the layer no longer get Pinia through it. A shop with its own
stores adds `@pinia/nuxt` to its own dependencies and `modules`.

## Measured

Production build, JS files the home page references (37 files):

|          | Before     | After      |
| -------- | ---------- | ---------- |
| raw      | 1,175.1 KB | 1,171.5 KB |
| gzip     | 341.3 KB   | 339.7 KB   |
| `pinia`  | 1 chunk    | 0 chunks   |

## Verified

- `pnpm build`, home page, category page and `/bestellung/warenkorb` in the
  browser without console errors (apart from the demo data icon
  `lucide:french-fries`, unrelated).
- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`,
  `pnpm test:unit` without the Matomo variables (264 tests).
