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

### Package manager

pnpm 12 (pinned in `package.json`, CI and `node.dockerfile`). Settings live in `pnpm-workspace.yaml` (`.npmrc` is auth/registry only since pnpm 11). pnpm 12 rejects packages published less than 24 hours ago (`minimumReleaseAge`), also in an existing lockfile; update dependencies with pnpm 12 itself, not an older global pnpm (`docs/notes/2026-09-21-dependency-update.md`).

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
- `patches/@shopware__nuxt-module@1.5.2.patch` (pnpm patch) points the plugin's `ShopwareNuxtOptions` import at `./dist/index` (the package ships no `src/`). Since 1.5.2 the plugin carries its explicit type upstream, so this one line is all that is left. When Renovate bumps `@shopware/nuxt-module`, the patch must be re-applied to the new version (`pnpm patch @shopware/nuxt-module@<version>`), or dropped once upstream fixes the import.

Do not name a project composable like one from the `@shopware/composables` layer (e.g. `useCategory`): the project version shadows the layer's inside the layer's own code as well.

## Architecture

### Stack

- **Nuxt 4** with `app/` directory convention (not `src/`)
- **Shopware 6** headless commerce backend via `@shopware/nuxt-module`, `@shopware/composables` (extended as a Nuxt layer), and `@shopware/api-client`
- **Tailwind CSS v4** (`@tailwindcss/vite`) + own base components on **Reka UI** (`app/components/Sb/`); Nuxt UI was removed in 2.0 (#445)
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
- **`useWishlistEntries`** – the wishlist (#467): an entry is a configured dish (product/variant id + number, `without`, `extras`, the quick view configuration of #411). Customers keep entries in the ShopBite plugin (`/store-api/shopbite/wishlist`, `/add`, `/merge`, `DELETE /{id}`, entity `shopbite_wishlist_item`, shopware-plugin#30), guests in localStorage `shopbite-wishlist` (old `sw-wishlist-items` ids are taken over). `app.vue` loads it on mount and on login merges the guest entries into the account (logout reloads the guest's); a backend without the routes (404) keeps customers in localStorage. On the first load a customer's Shopware core wishlist moves into the plugin and is deleted there. `WishlistSaveButton` (heart in the product sheet header, `aria-pressed` for the current configuration) gets the selection from `ProductDetail` (`selection-changed`); `Wishlist.vue` adds rows with `useAddToCart` (same container line item as the sheet) and opens the sheet on the wishlist page with the saved configuration ("Anpassen").
- **`useSyncWishlist`** – deliberate override of the layer composable (copy of `@shopware/composables` 1.13.0) that does not log the expected 404/403 of a missing or disabled wishlist (#366); only the layer's own `useWishlist` still uses it since #467; compare with the layer source when Renovate bumps `@shopware/composables`

### Product data model (what Shopware must contain)

The storefront reads plain Shopware entities with fixed names; seed data must match them exactly (`shopware/scripts/seed-demo-menu.py` is a working example):

- **Navigation:** menu sections are the children of the sales channel navigation root (`readNavigation main-navigation`), optionally scoped by `runtimeConfig.public.shopBite.menuCategoryId`. Category icon comes from the custom field `shopbite_category_icon` (icones.js.org name such as `i-lucide-pizza`), set by the ShopBite plugin.
- **Property groups:** `Hauptzutaten` (ingredients on the card, deselectable on the detail page, removed ones are appended to the cart label with "-"), `Vegetarisch` and `Vegan` with the option `Ja` (diet badges), `Küche` (kitchen badge). Filterable groups appear as listing filters.
- **Extras:** product cross-sellings of type `productList`; the cross-selling name is the label ("Extras", "Beilagen"), the assigned products need a price and sales-channel visibility but no category. In the quick view each cross-selling is a collapsible checkbox list that shows 6 entries of a long list and a search field above 15 entries (`Product/CrossSelling.vue`). Selected extras are sent as children of a `container` line item (`useAddToCart.ts`, handled by the ShopBite plugin). The bon card opens the quick view sheet (`Product/QuickView.vue`), whose state is the `produkt` query parameter (product number) via `useProductQuickView` (#325). That deep link is the product URL (#289, no product pages): `productDeepLink()` (`app/utils/productUrl.ts`) takes the product SEO URL when it carries `?produkt=` (the ShopBite plugin sets the template, shopware-plugin#28; the number must be `|url_encode|raw` in the template, the SEO escaper slugifies `ß`) and otherwise builds it from the category SEO URL. The card name is a stretched link to it (a plain click stays in place); a number not in the list (a variant) is loaded and opens with its options selected. The quick view keeps its configuration in the URL (#411): `ohne` (deselected ingredients by name) and `extras` (extras by product number), written live with `router.replace` by `useQuickViewConfiguration`; a variant switch updates `produkt` without swapping the sheet's product (numbers the sheet switched to itself are pinned). The share button (`useShareLink`) uses the Web Share API, else copies the link.
- **Custom fields on products:** `shopbite_receipt_print_type` (`number` prints the menu number on the receipt, `label` prints the name) and `shopbite_delivery_time_factor` (int) and `shopbite_cart_upsell` (bool, suggests the product on the order confirmation step `/bestellung/bestaetigen` via `useCartUpsell`; variant parents are never suggested, a flag on a parent applies to its variants), all from the ShopBite plugin.
- **Variants:** standard configurator settings (`Product/Configurator.vue`); `server/api/product/variant.get.ts` resolves a variant by option ids.

### Server routes

`server/api/address/autocomplete.get.ts` — Geoapify proxy (keeps API key server-side).
`server/utils/shopware/adminApiClient.ts` — Admin API client for server-side Shopware operations requiring elevated credentials.
`server/api/__sitemap__/urls.get.ts` — dynamic `@nuxtjs/sitemap` source (navigation categories from the Store API).
`server/routes/llms.txt.ts` — `/llms.txt` for AI assistants (#402): shop, hours, ordering and the menu with prices, ingredients and diets as Markdown, built by the pure `server/utils/llmsTxt.ts`; `swr` 1 h. Every Store API source is optional (`Promise.allSettled`), content pages blocked in `robots.txt` are left out.
`server/utils/storeApi.ts` — `storeApiPost()` and `MEDIA_INCLUDES` for the routes above. Always send Store API criteria as a POST body (also via `apiClient.invoke("… post …", { body })`): as `_criteria` query parameters Shopware ignores the `includes` projection and returns every field (#312).
Pages without content throw `createNotFoundError()` (`app/utils/notFound.ts`): fatal only in the browser, because a fatal error makes Nitro log a `[request error] [fatal]` block per scanner request (#363).
`modules/dev-tooling.ts` registers `@nuxt/eslint`, `@nuxt/hints` and `@nuxt/test-utils/module` only when the storefront itself is the project (not for shops extending the layer, not inside `node_modules`); they are devDependencies, so never add them to `modules` in `nuxt.config.ts` (#378).
`modules/public-cache.ts` (local module, also active in shops extending the layer) adds a 30-day `Cache-Control` route rule for every file in the `public/` folders of all layers; Nitro serves them without one. `image.ipx.maxAge` gives resized logos the same lifetime. Replace a public file under a new name (#273).
`server/api/content/*.get.ts` — Nuxt Content queries for the pages. Do not call `queryCollection()` in page code: in the browser it downloads the SQLite WASM build (865 KB) on client-side navigation (#314).

### Client-side JavaScript budget (#314)

- Nothing that the first paint does not need belongs in the entry chunk. Components that only some shops use go behind `Lazy…` + `v-if` (`SalesChannelSwitch`); the Matomo registry is imported in `plugins/matomo.ts` after `onNuxtReady`, tracking pushes to `_paq` via `useTrackEvent`.
- Overlays (`SbSheet`, collapsibles) are created on first use (`v-if` + `nextTick()` before opening), not mounted with the page — mounting forces a layout of the whole page.
- Long lists render on the server and hydrate on scroll: `hydrateWhenVisible(Component)` (`app/utils`) keeps the markup and the chunk, Used for the bon cards and the footer.
- `NuxtLink` prefetches on interaction only (`experimental.defaults.nuxtLink`), and Rolldown groups shared framework/UI modules into two chunks (`vite.build.rollupOptions.output.codeSplitting`). Measure with Lighthouse behind the h2 proxy (see `docs/notes/2026-09-10-issue-314-mobile-js-cost.md`) before changing either.

### Stylesheet (#319)

- Every family in the `--font-sans` stack costs a system font lookup per text style during the first layout. `fonts.defaults.fallbacks["sans-serif"]` is therefore limited to the phone system fonts (Roboto, Helvetica Neue); do not add desktop families back without measuring Style & Layout (`docs/notes/2026-09-12-issue-319-stylesheet-cost.md`).
- `main.css` keeps `--text-sm: 16px` (iOS zooms into smaller inputs), maps the tokens onto `sb-*` utilities (`@theme inline`) and styles the Markdown content pages (`.content-preset`, plain HTML since #445).

### Style presets and base components (#439–#446)

- Every shop has a style preset: `trattoria` (default), `grill` (dark) or `asia`. `shopBite.preset` in nuxt.config.ts (or `NUXT_SHOPBITE_PRESET` at build time) sets the default, `shopBite.colors` overrides tokens of that preset (the build warns when a pair misses WCAG AA). `modules/theme.ts` writes the stylesheets of all presets into the build (`.nuxt/shopbite-theme.css`, each scoped to `:root[data-preset=…]`) and registers their fonts (listed before `@nuxt/fonts`; browsers fetch only the faces in use). The active preset is runtime config `shopBite.themePreset` (`NUXT_PUBLIC_SHOP_BITE_THEME_PRESET`): `useThemePreset()` returns `preset`, `menuView` and `colorMode` (from `THEME_PRESETS`), `plugins/theme-preset.ts` sets `data-preset` on `<html>`. One build serves every preset; the lead demos rely on it. `shopBite.logoUrl` (`NUXT_PUBLIC_SHOP_BITE_LOGO_URL`) replaces the header logo files (`public/light|dark/Logo.png`, chosen by the preset's colour mode).
- Components style only with the `--sb-*` colour tokens and `--font-sb-display`/`--font-sb-body` (the `--font` prefix makes @nuxt/fonts resolve the family and add metric fallbacks) through the `sb-*` utilities (`bg-sb-surface`, `text-sb-ink-muted`, `font-display`, `rounded-sb-control`). No colour mode switch: the preset fixes light or dark.
- Base components live in `app/components/Sb/` (`SbButton`, `SbIconButton`, `SbSegmentedControl`, `SbSheet`, `SbChoiceGroup`, `SbCheckbox`, `SbField` + `SbInput`, `SbSelect` (native), `SbStepper`, `SbChip`, `SbStatusPill`, `SbStars`, `SbConfirmDialog`, `SbIcon` with inline stroke icons). Behaviour and accessibility come from Reka UI (radio groups, checkbox, dialog and alert dialog with focus trap). Every control is at least 44 px and has a visible focus ring; icon-only buttons need a `label`; toggles use `aria-pressed` with a stable name. Hide a base component responsively with a wrapper (`<span class="hidden sm:block">`): its own `inline-flex` wins over a `hidden` passed as class. Elements focused only by script (`tabindex="-1"`) get no focus ring. Entry animations go behind `motion-safe:` (a `motion-reduce:animate-none` loses against `data-[state=open]:animate-…`).
- No toasts (removed in #445, other responses to be designed): results and errors show where they happen, e.g. `role="alert"` boxes in forms and the checkout, `role="status"` regions, the voucher error at its field.
- Menu (#441): `Category/Listing.vue` has three columns from `lg` (`MenuCategoryIndex` word list, the list, `MenuCartPanel`), `NavigationMobileTop` below `lg`; `MenuSectionHeader` and `MenuBonCard` (one column, number strip, `photo` for the `bonPhoto` view). The card's button adds a product straight to the cart unless `productNeedsChoice()` (a parent with variants, `childCount` in the listing projection), which opens the quick view; extras stay optional. Cards hydrate on approach (`hydrateWhenVisible`), so a click on a card that has not hydrated yet is lost. Filters live in an `SbSheet`, sorting is an `SbSelect` (`toSortingOptions()`).
- Product sheet (#442): `SbSheet` with a bon header (number strip, name as `DialogTitle`, diet and description as `DialogDescription`); `Configurator` shows variants as `SbChoiceGroup` (required), `DeselectIngredient` as `SbChip` ingredient chips (pressed = included), `CrossSelling` as `SbCheckbox` rows with a search, `Detail` a sticky footer with `SbStepper` and the add button.
- Cart and checkout (#443): `MenuOrderMode` (`useOrderMode`) and the checkout's shipping section list ALL active shipping methods (`useShippingMethodChoice`, `onlyAvailable: false`), because a delivery-area rule on the shipping city never matches before the guest has an address (La Fattoria, fixed in 2.0.3); `useCheckoutMethodGuard` switches only a blocked payment method, a blocked shipping method is reported in the checkout and never switched to pickup. It shows the shipping methods as an `SbSegmentedControl` only when there are two to four. The header cart opens an `SbSheet`; `Cart/Item` uses `SbStepper` (remove at 1). The checkout is one page, `/bestellung/kasse` (the old step routes 301 there, `routeRules`): numbered sections Lieferung oder Abholung (`CheckoutPaymentAndDelivery part="shipping"`), Wann, Ihre Angaben (`CheckoutLoginOrRegister` with Reka tabs, `UserRegistrationForm` (logic in `useRegistrationForm`) / `UserLoginForm`, or `UserDetail`), Bezahlung (`part="payment"`) and the order card in `Checkout/Summary.vue`; the order button says "Zahlungspflichtig bestellen" (§ 312j BGB). Forms validate with Zod on submit and show errors at the fields plus a focused summary in form order; `AddressFields` sets `autocomplete`.
- Order and account (#445): `/bestellung/<id>/erfolg` and `/bestellung/<id>` render `OrderConfirmation` (`OrderDetail`: facts incl. the wished time from the `customerComment`, receipt lines, totals; call card), `/bestellung/<id>/fehler` a payment retry. Login, registration, password pages and the registration confirmation render in `UserAuthPanel`; the account pages in `layouts/account.vue` (link navigation with `aria-current`) with `UserAccountHeader`; `AddressForm` (also used when an address is edited in the checkout). Irreversible actions confirm with `SbConfirmDialog` (focus starts on "Abbrechen"). Search, contact (`useContactForm`), wishlist (`useWishlistEntries`, #467), content pages and `error.vue` (with its own `Header`/`Footer`, because the error page replaces `app.vue`) use the same pieces.
- Home page (#444): `pages/index.vue` renders `HomeHero` (kicker, `[highlight]{.text-primary}` part in the accent colour via `splitHighlight()`, buttons from `hero.links`, live status, rating card from the Google `usp`; the photo is `hero.image` with the blurred video `hero.poster` as fallback, cropped 4:5 at `hero.imagePosition` (object-position); it sits in a `<picture>` with a `min-width: 640px` source, so phones load a 1 px GIF), `HomeFacts` (`features`), `HomeCategories` (word list, `useHomeMenuCategories`; a wide first category image switches to a full-width photo below the words, and `sizes` asks for the width the crop needs, since thumbnails are picked by width), `HomeHighlights` (top sellers as bon cards), `HomeRestaurant` (`gallery` + opening hours in the SSR HTML) and the two-column `HomeFaq`; `cta` and `mittagstisch` in `content/index.yml` are not shown.
- Header and footer (#455): `Header.vue` (logo, main nav, status pill, phone, account, wishlist, cart button opening the cart `SbSheet`, menu `SbSheet` on phones), `Footer.vue` (address, hours, footer navigation columns). `app.vue` has the skip link to `main#inhalt`.
- Every colour pair a component renders must be in `CONTRAST_PAIRS`; `test/unit/themePresets.spec.ts` fails if a preset misses WCAG AA. Accent red is for headlines only, never on controls (reads as negative).

### SEO

- This repository, deployed as the app, is the demo shop (demo.shopbite.de) and must not be crawled: its Dokploy deployment sets `NUXT_SITE_INDEXABLE=false`. Never set `site.indexable` in `nuxt.config.ts`: shops extending the layer would inherit it and drop out of search engines.
- `server/plugins/site-url.ts` makes `storeUrl` the nuxt-site-config URL, so canonical, sitemap and robots.txt share one base. Build absolute URLs with `toAbsoluteUrl(useSiteConfig().url, path)` (`app/utils/seo.ts`).
- `app.vue` sets the title template (`site.titleTemplate`), canonical from the route, `og:url`, fallback `og:image` (`site.ogImage`) and `twitter:card`. Page titles are plain (`"Warenkorb"`), never suffixed with the shop name. Indexable pages use `usePageSeo` (`standalone: true` skips the template, home page); categories use `useCategorySeo`, which overrides the canonical with the SEO URL.
- Shopware category SEO URLs end in `/` and 404 without it, but the sitemap module strips trailing slashes from every URL. Sitemap entries that need the slash carry `_trailingSlash: true`; `server/plugins/sitemap-trailing-slash.ts` restores it in the XML. Never normalise trailing slashes of backend SEO URLs.
- There are no category page routes: the catch-all `pages/[...all].vue` serves Markdown content pages first and otherwise the category SEO URL of the path, whatever prefix the Shopware template gives it (`/c/Pizza/`, `/speisekarte/pizza/`); paths with a file extension 404 without a backend request. It resolves the path with `useSeoUrlRoute` (category SEO URLs only, product SEO URLs 404, #289), which redirects (301) aliases to the SEO URL: other casing, toggled trailing slash, and old SEO URLs that Shopware keeps after a template or name change (`isCanonical: null`). The Store API hides old SEO URLs unless the criteria filter on `isCanonical` explicitly, so `resolvePath` never finds them; `resolveOldPath` looks them up separately, only for unknown paths.
- `@nuxtjs/sitemap` must stay before `@nuxt/content` in `modules`; content collections need the `sitemap` schema field to appear in the sitemap.
- The home page FAQ (`faq` in `content/index.yml`, `Home/Faq.vue`, #404) uses native `<details>`, not a Reka accordion, which unmounts closed panels, and the answers must be in the SSR HTML. The same items feed the `FAQPage` JSON-LD and `/llms.txt`.
- `server/plugins/ai-crawlers.ts` adds two named robots.txt groups via the `robots:config` hook (#403): AI search/assistant bots and AI training bots (lists with sources in `server/utils/aiCrawlers.ts`), toggled by `runtimeConfig.aiCrawlers.search`/`.training`. A crawler matching a named group ignores `*`, so allowed groups repeat the `robots.disallow` paths.
- Shop contact data (NAP) lives in `runtimeConfig.public.site` (`address.*`, `telephone`, `googleBusinessProfileUrl`; `alternateNames` lists other names the shop is listed under, for the Restaurant schema `alternateName` and `/llms.txt`) and is rendered by `components/Footer/Contact.vue`. `useBusinessHours`/`useHolidays` use `immediate: false` (app.vue loads them on mount); a component that needs them in the SSR HTML calls `onServerPrefetch(() => refresh())`. In the browser both requests are retried twice (`withRetries`); `useOpeningHoursData` gives components the combined loading/failed state and `retry()`, and reports a failure only after mounting (a failed server prefetch would otherwise break hydration, #355). Anything that depends on the current time (open/closed status, "today") is computed after mounting: `useStoreStatus` starts its clock in `onMounted`, because the home page prefetches the hours on the server and the server's clock and time zone differ from the visitor's (hydration mismatch, #365).

### Layer imports

Shops extend the storefront as a Nuxt layer, so paths must resolve from the storefront itself: `~`, `@` and `#shared` point to the shop's folders there. App code imports nothing from `shared/` (only types; a relative import breaks the Nitro server bundle), so `modules/theme.ts` passes what the app needs through runtime config (`shopBite.themePresets`). Files in `nuxt.config.ts` use `fileURLToPath(new URL("./…", import.meta.url))` (`css`, local modules). `main.css` lists `@source "../.."`, because Tailwind's automatic detection only scans the shop. `test/layer/` is a minimal shop (`extends: ["../.."]`) that the CI job `layer-build` builds (`pnpm nuxt build test/layer`); 2.0.0 broke every shop because only the storefront itself was built.

### Testing setup

Two Vitest projects in `vitest.config.ts`:

- **`unit`** – `test/unit/`, Node environment, pure function tests
- **`nuxt`** – `test/nuxt/`, Nuxt environment via `@nuxt/test-utils`, for composables and components

In `test/nuxt/`, a `mockNuxtImport("useRuntimeConfig")` without `app.baseURL` breaks the router setup of the test environment (`useRouter()` is undefined, see `useAddressAutocomplete.test.ts` for a working mock). For config values, prefer setting them on the real config, e.g. `Object.assign(useRuntimeConfig().public.site, { … })`.

Accessibility checks (#446) in `test/a11y/` run axe (WCAG 2.1 AA) on home, menu, product sheet, cart, checkout, order confirmation and payment failure (the order is a mocked Store API response), login, registration and the password pages, search, contact, wishlist, a content page and the 404 page, desktop and phone (`pnpm test:a11y`, Playwright projects `a11y` and `a11y-mobile`); serious and critical violations fail. They need no login and only add a product to a guest cart. They test the running build (Playwright starts `.output/server/index.mjs`); the preset is runtime config, so CI runs the `a11y` matrix job per preset on one build with `NUXT_PUBLIC_SHOP_BITE_THEME_PRESET`. Locally: `pnpm build`, then `NUXT_PUBLIC_SHOP_BITE_THEME_PRESET=grill NUXT_PUBLIC_STORE_URL=http://localhost:<port> pnpm test:a11y`.

E2E tests in `test/e2e/` use Playwright (Chromium only) and require `TEST_USER` / `TEST_USER_PASS` env vars. A local dev server must be running before the suite executes.

### Route rendering strategy

Most pages are SSR. Exceptions defined in `nuxt.config.ts` route rules:

- `/wishlist` – client-side rendered (wishlist fetching deferred to client)
- `/registrierung/bestaetigen/**` – client-side rendered

### CI

`.github/workflows/ci.yaml` runs four jobs in sequence: **setup** (install + build, cached) → **lint** → **unit tests** → **e2e tests**. The `build.yaml` workflow handles Docker image builds and NPM publishing on releases.
