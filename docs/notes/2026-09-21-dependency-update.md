# Dependency update — 2026-09-21

Branch `chore/dependency-update-2026-09-21`. Previous round:
`2026-09-07-dependency-update.md`.

## Packages

| Package | From | To |
| --- | --- | --- |
| @shopware/api-client | 1.5.1 | 1.6.0 |
| @shopware/composables | 1.12.1 | 1.13.0 |
| @shopware/helpers | 1.7.2 | 1.8.0 |
| @shopware/nuxt-module | 1.5.1 | 1.5.2 |
| @vueuse/core | 14.4.0 | 15.0.0 (major) |
| dotenv | 17.4.2 | 18.0.1 (major) |
| @sentry/nuxt | 10.73.0 | 10.75.0 |
| vue (compiler-dom, server-renderer) | 3.5.42 | 3.5.43 |
| eslint / prettier / jsdom / @vue/test-utils / @types/node | | latest minor/patch |
| pnpm | 10.34.5 | 12.5.1 (major, see below) |

Held back, as in the previous round:

- **typescript 7**: typescript-eslint 8.70 still declares `typescript >=4.8.4 <6.1.0`.
- **@nuxt/devtools-kit 4**: only a beta (`4.0.0-beta.1`).

## What needed changes

### @shopware/nuxt-module 1.5.2

1.5.2 gives its plugin the explicit `Plugin<…>` type upstream (the main
reason for our patch, see `2026-09-08-issue-277-typecheck.md`). The plugin
still imports `ShopwareNuxtOptions` from `./src`, which the package does not
ship, so the patch shrinks to that one import (`./dist/index`):
`patches/@shopware__nuxt-module@1.5.2.patch`.

### @shopware/api-client 1.6.0: operation renamed

`createOrderFromQuote post /quote/order/{id}` is now
`createOrderFromQuote post /quote/{id}/order`. `shopware.d.ts` re-maps that
operation's response to our `Order` schema, so the key had to follow;
otherwise `useB2bQuoteManagement` fails the typecheck (`extensions` of
`order_line_item` differ between the default and our generated types).

### @shopware/composables 1.13.0

`useSyncWishlist` and `useWishlist` are unchanged from 1.12.1; our override
(`app/composables/useSyncWishlist.ts`, #366) stays valid.

### @vueuse/core 15 / dotenv 18

vueuse 15 drops Node 20 and the deprecated timer options (we call
`useIntervalFn(fn, ms)` without options); CI and the Docker image run Node 24.
dotenv 18 only adds a CLI and an opt-in parser; `playwright.config.ts` is
unaffected.

### pnpm 12

- Since pnpm 11 `.npmrc` is read for auth/registry only.
  `shamefully-hoist=true` moved to `pnpm-workspace.yaml` (`shamefullyHoist`),
  `.npmrc` is gone (also from `node.dockerfile`'s `COPY`).
- pnpm 12 fails on unknown keys in `pnpm-workspace.yaml` when the pinned
  version matches.
- **`minimumReleaseAge` defaults to 24 hours.** A lockfile resolved with
  pnpm 10 on the same day contained three transitive packages published
  within the last 24 hours (`@asamuzakjp/css-color` 7.0.1, `whatwg-url`
  17.1.2, `yargs` 18.2.0) and was rejected
  (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`); `pnpm update` cannot fix that,
  because the check runs before resolution. The update was redone with
  pnpm 12 on top of `main`'s lockfile, which resolves the previous versions.
  Keep the default: it is a supply-chain safeguard.
- pnpm 12 also re-resolved the `workbox-build`/`workbox-window` peers of
  `vite-plugin-pwa` to 7.4.1 (pnpm 10 kept 7.3.0 and printed unmet-peer
  warnings on every update).
- Pinned in `package.json` (`packageManager`), `.github/workflows/ci.yaml`,
  `.github/workflows/build.yaml` and `node.dockerfile` (`PNPM_VERSION`, was
  still 10.32.1).
- `pnpm peers check` lists three unmet peers deep in Nuxt tooling
  (`cac` for `@bomb.sh/tab`, `oxc-parser` and `unplugin` for `unctx`);
  nothing to fix on our side.

## Verification

- `pnpm eslint`, `pnpm prettier`, `pnpm typecheck` (0 errors),
  `pnpm test:unit` (302 tests), `pnpm build`, `pnpm install --frozen-lockfile`
  — all with pnpm 12.5.1.
- `docker build -f node.dockerfile --target build` (corepack pnpm 12.5.1).
- Production build against the demo backend: menu with 63 products, quick
  view, add to cart (line-item request), item in `/bestellung/warenkorb`, no
  console errors.
