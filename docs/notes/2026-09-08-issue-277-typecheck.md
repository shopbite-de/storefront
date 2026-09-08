# Issue #277 — `pnpm typecheck` failed on `main` with 37 errors

Date: 2026-09-08 · Branch: `fix/issue-277-typecheck`

## Symptom

`pnpm typecheck` exited with 37 `error TS…` lines. CI did not run it, so
nobody noticed. 7 errors were in our test files, 30 in package sources
that Nuxt pulls into the type program:

| Source                                                | Errors |
| ----------------------------------------------------- | ------ |
| `@shopware/composables/src/useB2bQuoteManagement.ts`  | 14     |
| `@shopware/nuxt-module/plugin.ts`                     | 12     |
| `@shopware/composables/src/useListing.ts`             | 2      |
| `@shopware/composables/src/useCartItem.ts`            | 1      |
| `@shopware/composables/src/useNewsletter.ts`          | 1      |
| our tests                                             | 7      |

Why package sources are checked at all: `@shopware/composables` is
consumed as a Nuxt **layer**, so its `src/*.ts` are compiled as part of
the app, and `@shopware/nuxt-module` ships its plugin as `plugin.ts`.
`skipLibCheck` only skips `.d.ts` files, and `exclude` does not help
because the files are reached through imports.

## Root causes and fixes

### 1. Custom API types miss what the layer references (15 errors)

`shopware.d.ts` replaces the `#shopware` `operations`/`Schemas` with the
types generated from **our** Shopware instance. The layer also references
endpoints/schemas our instance does not expose (B2B `Quote`, newsletter
status responses).

Fix: `shopware.d.ts` now falls back to the api-client's default types for
keys missing in ours (`Omit<Default, keyof Custom> & Custom`). Ours always
win where both exist. One fallback operation
(`createOrderFromQuote`) has its response re-mapped to our `Order`
because the composable compares it against `Schemas["Order"]`.

### 2. `useListing` broke because we shadowed `useCategory` (2 errors)

Project composables override layer composables **everywhere**, including
inside the layer's own code. Our async `useCategory(categoryId)` was
picked up by the layer's `useListing`, which calls `useCategory()`
synchronously. This was also a latent runtime bug.

Fix: renamed ours to `useCategoryById`. Rule added to `CLAUDE.md`.

### 3. Shopware 6.7 schema differences (2 errors)

- `LineItem.payload` is required in the 6.7 OpenAPI schema; the layer
  casts it as optional. Container/promotion/custom line items have no
  product payload anyway, so `shopware.d.ts` keeps `payload` optional.
- `POST /newsletter/subscribe` is documented without a response body; the
  layer reads `status` from it. `api-types/storeApiSchema.shopbite.overrides.json`
  adds the response the default types declare.

`api-gen.config.json` now also applies the **upstream** schema patches
(`@shopware/api-client/api-types/storeApiSchema.overrides.json`) when
running `pnpm generate-types`, which is what the layer is written against.
Regenerating changed `customFields` typings (`GenericRecord` →
`CustomFields | null`) and a few required flags; app code typechecks
unchanged.

### 4. `@shopware/nuxt-module` plugin (12 errors)

Three upstream problems in `plugin.ts` of 1.5.1:

- `import type { ShopwareNuxtOptions } from "./src"` — `src` is not
  published.
- No types for `js-cookie` → added `@types/js-cookie` as devDependency.
- Nuxt's generated `NuxtApp` augmentation infers the plugin's provided
  type from `typeof import(plugin)`, while the plugin body reads
  `NuxtApp.ssrContext`. With an untyped default export this is a cycle
  ("Type 'NuxtApp' recursively references itself") that cascades into
  implicit `any` errors.

Fix: pnpm patch (`patches/@shopware__nuxt-module@1.5.1.patch`) that
imports the type from `./dist/index` and annotates the export as
`Plugin<{ shopwareApiClient: ApiClient }>`. **When Renovate bumps
`@shopware/nuxt-module`, the patch has to be re-created for the new
version** (`pnpm patch @shopware/nuxt-module@<version>`, apply the same
two changes, `pnpm patch-commit`). pnpm fails the install if the patch no
longer applies, so a stale patch cannot go unnoticed. Worth reporting
upstream (shopware/frontends).

### 5. Test typings (7 errors)

Small fixes: typed `onUpdate:modelValue` handler, removed a `global`
detour in `HeaderRight.test.ts`, `ref<unknown>(null)`, full
`IntersectionObserverCallback` arguments, and a typed `useCategorySeo`
holder with a cast helper in the unit spec.

## Process changes

- `typecheck` script is now `nuxt typecheck` (was `pnpx nuxt typecheck
  --cwd=app`, which downloads a Nuxt via dlx instead of using the local one).
- CI lint job runs `pnpm typecheck` after ESLint.
