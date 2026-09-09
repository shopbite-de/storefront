<div align="center">

# 🍕 ShopBite Storefront

**A headless Shopware 6 storefront built for food delivery.**

Nuxt 4 · Vue 3 · Tailwind CSS v4 · TypeScript — shipped as a reusable Nuxt layer,
so every shop is a handful of config lines instead of a fork.

[![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Shopware](https://img.shields.io/badge/Shopware-6-189EFF?logo=shopware&logoColor=white)](https://www.shopware.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff5b00)](./LICENSE)

<img src="./public/screenshot-desktop.png" alt="ShopBite storefront" width="820">

</div>

---

## Why this exists

Generic shop templates don't know that a kitchen closes at 22:00, that a pizza comes
with four toppings priced individually, or that "delivery in 30 minutes" has to be
validated against today's opening hours _and_ the public holiday calendar.

ShopBite does. It's a pure headless frontend — no Shopware template engine, no Twig —
talking to the Store API and to the custom routes added by the
[ShopBite Shopware plugin](https://github.com/shopbite-de/shopware-plugin).

## Features

|                               |                                                                             |
| ----------------------------- | --------------------------------------------------------------------------- |
| 🕒 **Opening hours**          | Multi-interval business hours per weekday, live open/closed state           |
| 📅 **Delivery slots**         | 5-minute increments, respects prep time, holidays and closing times         |
| 🧀 **Extras & toppings**      | Configurable products grouped into container line items (UUID v5 reference) |
| 📍 **Address autocomplete**   | Geoapify via a server proxy — the API key never reaches the browser         |
| 🚚 **Delivery zones**         | City/postcode validation before checkout even starts                        |
| 🎟️ **Vouchers**               | Discount codes backed by the ShopBite plugin                                |
| 📱 **Installable PWA**        | Offline-aware service worker, app manifest, mobile bottom navigation        |
| ⚡ **SSR + caching**          | Server routes with tuned TTLs for products, listings, categories            |
| 🔍 **SEO ready**              | German URL routes, canonical redirects, robots rules, structured metadata   |
| 📊 **Analytics & monitoring** | Matomo via `@nuxt/scripts`, error tracking via Sentry                       |
| 🎨 **Themeable**              | Nuxt UI + Tailwind v4 tokens — brand a shop by overriding CSS variables     |
| 🌐 **Multi-channel**          | Optional sales channel switching for multi-location businesses              |

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The shop is now running on **http://localhost:3000**.

> **Prerequisites** — Node.js LTS, pnpm 10+, and a Shopware 6 instance with the
> [ShopBite plugin](https://github.com/shopbite-de/shopware-plugin) installed
> (required for business hours, holidays and shop config).

### Minimum configuration

| Variable                                | What it does                                                  |
| --------------------------------------- | ------------------------------------------------------------- |
| `NUXT_PUBLIC_SHOPWARE_ENDPOINT`         | Store API base URL, e.g. `https://shop.example.com/store-api` |
| `NUXT_PUBLIC_SHOPWARE_ACCESS_TOKEN`     | Sales channel access key                                      |
| `NUXT_STORE_NAME` / `STORE_DESCRIPTION` | Branding for `<head>`, PWA manifest and OG tags               |
| `NUXT_GEOAPIFY_API_KEY`                 | Server-side key for address autocomplete (optional)           |

See [`.env.example`](./.env.example) for the full list.

## Use it as a Nuxt layer

This package is published to npm and designed to be **extended**, not cloned.
A complete shop looks like this:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ["@shopbite-de/storefront"],
  runtimeConfig: {
    public: {
      site: {
        name: "Masala Mio",
        description: "Indische Küche, italienisch gedacht",
      },
    },
  },
});
```

Everything — pages, components, composables, server routes — comes along. Override any
file by recreating it at the same path in your own `app/` directory.

## Scripts

```bash
pnpm dev              # Dev server on :3000
pnpm build            # Production build
pnpm preview          # Preview the production build
pnpm generate         # Static generation

pnpm typecheck        # nuxt typecheck — must stay at zero errors
pnpm lint:fix         # Prettier + ESLint, autofix

pnpm test:unit        # Vitest (unit + Nuxt environments)
pnpm test:e2e         # Playwright, Chromium — needs a running server
pnpm test:ui          # Vitest UI

pnpm generate-types   # Regenerate Store API types after plugin changes
```

Run a single test:

```bash
pnpm vitest run test/nuxt/useBusinessHours.test.ts
pnpm playwright test test/e2e/simple-checkout-as-recurring-customer.test.ts
```

## Architecture

```
app/
├── components/     Cart, Checkout, Product, Food, Navigation, Header, …
├── composables/    Business logic — useBusinessHours, useDeliveryTime, useAddToCart, …
├── pages/          German routes: /speisekarte, /warenkorb, /konto, /bestellung
├── stores/         Pinia (checkout state)
├── validation/     Zod schemas for forms
└── assets/css/     Tailwind v4 theme tokens
server/api/         Cached Store API proxies + the Geoapify key guard
api-types/          Auto-generated Store API types (pnpm generate-types)
content/            Legal pages as Markdown (@nuxt/content)
test/               unit · nuxt · e2e
```

**Composables carry the domain.** `@shopware/composables` is extended as a Nuxt layer,
so project composables in `app/composables/` transparently override the upstream ones.
API responses are validated with Zod before they reach a component.

Key ones worth knowing:

- **`useBusinessHours`** — opening hours with multiple intervals per day (Sunday is day 7)
- **`useDeliveryTime`** — slot validation in 5-minute steps, prep time and holiday aware
- **`useAddToCart`** — extras/toppings become a container line item keyed by UUID v5
- **`useShopBiteConfig`** — delivery config and checkout state from the plugin
- **`useAddressAutocomplete`** — Geoapify behind `/api/address/autocomplete`

## Docker

```bash
docker compose up --build     # → http://localhost:3000
./container pnpm -v           # run a command inside the container
```

## Contributing

CI runs **setup → lint → unit → e2e** on every push. Before opening a PR:

```bash
pnpm lint:fix && pnpm typecheck && pnpm test:unit
```

Engineering notes for tricky changes live in [`docs/notes/`](./docs/notes);
day-to-day conventions and gotchas are in [`CLAUDE.md`](./CLAUDE.md).

## Related services

| Repo                                                                | Role                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`shopware-plugin`](https://github.com/shopbite-de/shopware-plugin) | Custom Store API routes, DAL entities, checkout processors  |
| `migrator`                                                          | Scrapes restaurant menus and imports them via the Admin API |
| `order-printer`                                                     | Polls orders and prints them on an ESC/POS thermal printer  |

## License

[MIT](./LICENSE) — built with 🔥 by [@veliu](https://github.com/veliu)
