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
pnpm generate-types   # Regenerate api-types/storeApiTypes.d.ts from schema
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

Always run `nuxt typecheck` via the `pnpm typecheck` script, not via `npx vue-tsc`. The global npx-cached `vue-tsc` version may not be compatible with the project's installed `vue-router`. If `.nuxt/tsconfig.json` has stale pnpm paths after a dependency update, run `pnpm nuxt prepare` to regenerate it.

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

Custom ShopBite plugin endpoints are prefixed `shopbite.*` in the operations type (e.g. `shopbite.business-hour.get`, `shopbite.config.get`). Run `pnpm generate-types` after Shopware plugin changes.

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
