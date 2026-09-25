# Dependency update — 2026-09-25

Branch `chore/dependency-update-2026-09-25`. Previous round:
`2026-09-21-dependency-update.md`.

## Packages

| Package                                          | From    | To      |
| ------------------------------------------------ | ------- | ------- |
| @nuxt/ui                                         | 4.11.1  | 4.11.2  |
| dotenv                                           | 18.0.1  | 18.0.3  |
| @typescript-eslint/eslint-plugin, parser         | 8.70.0  | 8.70.1  |
| jsdom                                            | 30.1.0  | 30.1.1  |
| prettier                                         | 3.9.8   | 3.9.9   |
| @sentry/nuxt                                     | 10.75.0 | removed |

Transitive packages were refreshed within their ranges (`pnpm update`).

Held back, as in the previous rounds:

- **typescript 7**: typescript-eslint 8.70.1 still declares
  `typescript >=4.8.4 <6.1.0`.
- **@nuxt/devtools-kit 4**: only a beta (`4.0.0-beta.1`).

## Sentry removed

`@sentry/nuxt` 11.0.0 is a major release (data collection and span streaming
on by default, `sendDefaultPii` replaced by `dataCollection`, orchestrion
build-time instrumentation auto-wired into the Nitro build). The storefront
only registered the module in `nuxt.config.ts`; it had no
`sentry.client.config.ts` / `sentry.server.config.ts`, no module options and
no shop uses it. Instead of migrating an unused integration, it is dropped:

- `@sentry/nuxt` removed from `package.json`, `@sentry/nuxt/module` from
  `modules` in `nuxt.config.ts`, `@sentry/cli` from `allowBuilds` in
  `pnpm-workspace.yaml` (the CLI was the only package needing a postinstall
  build for Sentry).
- README feature table: "Analytics & monitoring" is now "Analytics" (Matomo).
- Lockfile shrinks by the whole `@sentry/*` and OpenTelemetry tree
  (`pnpm-lock.yaml`: −556 lines net).
- `NUXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` in a local `.env` or in
  Dokploy are now ignored and can be deleted. A shop that wants error
  tracking adds `@sentry/nuxt` to its own dependencies and `modules`.

`pnpm peers check` now lists two unmet peers (`oxc-parser` and `unplugin`
for `unctx`); the `cac` peer from the previous round is gone.

## Verification

- `pnpm eslint`, `pnpm prettier`, `pnpm typecheck` (0 errors),
  `pnpm test:unit` (305 tests), `pnpm build`, `pnpm install --frozen-lockfile`
  — all with pnpm 12.5.1.
- Production build against the demo backend (`node .output/server/index.mjs`
  with the local `.env`): `/`, `/bestellung/warenkorb` and `/sitemap.xml`
  return 200, no `sentry` string in the HTML, nothing in the server log.
