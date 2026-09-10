# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm generate         # Static generation
pnpm preview          # Preview production build

# Type checking
pnpm typecheck        # nuxt typecheck (uses project-local vue-tsc, not npx)

# Linting & formatting
pnpm lint:fix         # Run prettier:fix + eslint:fix
pnpm eslint           # Check ESLint
pnpm prettier         # Check Prettier

# Testing
pnpm test:unit        # Vitest (unit + nuxt environments, with coverage)
pnpm test:e2E         # Playwright e2e (Chromium, requires .env.test)

# Shopware API types
pnpm generate-types   # Regenerate api-types/storeApiTypes.d.ts from schema (then run pnpm lint:fix)
pnpm load-schema      # Reload Shopware API schema
```

### Running a single test

```bash
# Vitest – filter by test name or file path
pnpm vitest run test/nuxt/useBusinessHours.test.ts
pnpm vitest run --reporter=verbose -t "should return true"

# Playwright – filter by file
pnpm playwright test test/e2e/checkout.spec.ts
```

### Typecheck note

Always run `nuxt typecheck` via the `pnpm typecheck` script, not via `npx vue-tsc`. The global npx-cached `vue-tsc` version may not be compatible with the project's installed `vue-router`. If `.nuxt/tsconfig.json` has stale pnpm paths after a dependency update (or after adding/renaming a composable), run `pnpm nuxt prepare` to regenerate it.

`pnpm typecheck` must stay at zero errors; CI runs it in the lint job. The sources of `@shopware/composables` and the `@shopware/nuxt-module` plugin are part of the checked program, so three things keep them green (see `docs/notes/2026-09-08-issue-277-typecheck.md`):

- `shopware.d.ts` falls back to the api-client's default types for operations/schemas our instance does not expose, and keeps `LineItem.payload` optional.
- `api-gen.config.json` applies the upstream schema patches plus `api-types/storeApiSchema.shopbite.overrides.json` when generating types.
- `patches/@shopware__nuxt-module@1.5.1.patch` (pnpm patch) gives the module's plugin an explicit type. When Renovate bumps `@shopware/nuxt-module`, the patch must be re-applied to the new version (`pnpm patch @shopware/nuxt-module@<version>`).

Do not name a project composable like one from the `@shopware/composables` layer (e.g. `useCategory`): the project version shadows the layer's inside the layer's own code as well.

## Architecture

### Stack

- **Nuxt 4** with `app/` directory convention (not `src/`)
- **Shopware 6** headless commerce backend via `@shopware/nuxt-module`, `@shopware/composables` (extended as a Nuxt layer), and `@shopware/api-client`
- **Tailwind CSS v4** + **Nuxt UI** component library
- **Zod** for form validation schemas (`app/validation/`)
- **PWA** via `@vite-pwa/nuxt` (strategy configurable via `SW` env var)
- German-language URL routes (`/konto/`, `/warenkorb/`, etc.)

### Shopware type system

Custom Shopware Store API types are auto-generated into `api-types/storeApiTypes.d.ts`. The module augmentation in `shopware.d.ts` wires them into the `#shopware` virtual module:

```ts
declare module "#shopware" {
  export type operations = import("./api-types/storeApiTypes").operations;
  export type Schemas =
    import("./api-types/storeApiTypes").components["schemas"];
}
```

Custom ShopBite plugin endpoints are prefixed `shopbite.*` in the operations type (e.g. `shopbite.business-hour.get`, `shopbite.config.get`). Run `pnpm generate-types` after Shopware plugin changes, then `pnpm lint:fix` (the generator output is not Prettier-formatted). `shopware.d.ts` merges the generated types with the api-client defaults so the composables layer typechecks (see Typecheck note).

### Composables layer

`@shopware/composables` is consumed as a **Nuxt layer** (via `extends` in `nuxt.config.ts`). This means its composables, components, and pages are auto-imported alongside the project's own `app/composables/`. Project-level composables override the layer.

Key custom composables:

- **`useBusinessHours`** – opening hours with multi-interval support; Sunday is day 7 (not 0)
- **`useDeliveryTime`** – validates slots in 5-minute increments, accounts for `deliveryMinutes` (default 30), handles holidays
- **`useAddToCart`** – products with extras/toppings use UUID v5 (product ID + sorted extras) as container item reference; simple products bypass the container
- **`useAddressAutocomplete`** – proxies Geoapify through `/api/address/autocomplete` to avoid exposing the API key client-side
- **`useShopBiteConfig`** – fetches delivery config and checkout state from the custom Shopware plugin

### Server routes

`server/api/address/autocomplete.get.ts` — Geoapify proxy (keeps API key server-side).
`server/utils/shopware/adminApiClient.ts` — Admin API client for server-side Shopware operations requiring elevated credentials.
`server/api/__sitemap__/urls.get.ts` — dynamic `@nuxtjs/sitemap` source (navigation categories from the Store API).

### SEO

- `server/plugins/site-url.ts` makes `storeUrl` the nuxt-site-config URL, so canonical, sitemap and robots.txt share one base. Build absolute URLs with `toAbsoluteUrl(useSiteConfig().url, path)` (`app/utils/seo.ts`).
- `app.vue` sets the title template (`site.titleTemplate`), canonical from the route, `og:url`, fallback `og:image` (`site.ogImage`) and `twitter:card`. Page titles are plain (`"Warenkorb"`), never suffixed with the shop name. Indexable pages use `usePageSeo` (`standalone: true` skips the template, home page); categories use `useCategorySeo`, which overrides the canonical with the SEO URL.
- Shopware category SEO URLs end in `/` and 404 without it, but the sitemap module strips trailing slashes from every URL. Sitemap entries that need the slash carry `_trailingSlash: true`; `server/plugins/sitemap-trailing-slash.ts` restores it in the XML. Never normalise trailing slashes of backend SEO URLs.
- `@nuxtjs/sitemap` must stay before `@nuxt/content` in `modules`; content collections need the `sitemap` schema field to appear in the sitemap.

### Testing setup

Two Vitest projects in `vitest.config.ts`:

- **`unit`** – `test/unit/`, Node environment, pure function tests
- **`nuxt`** – `test/nuxt/`, Nuxt environment via `@nuxt/test-utils`, for composables and components

E2E tests in `test/e2e/` use Playwright (Chromium only) and require `TEST_USER` / `TEST_USER_PASS` env vars. A local dev server must be running before the suite executes.

### Route rendering strategy

Most pages are SSR. Exceptions defined in `nuxt.config.ts` route rules:

- `/wishlist` – client-side rendered (wishlist fetching deferred to client)
- `/registrierung/bestaetigen/**` – client-side rendered

### CI

`.github/workflows/ci.yaml` runs four jobs in sequence: **setup** (install + build, cached) → **lint** → **unit tests** → **e2e tests**. The `build.yaml` workflow handles Docker image builds and NPM publishing on releases.
