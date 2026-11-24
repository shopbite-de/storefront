---
status: accepted
date: 2026-11-24
---

# 0002: One locale per shop, chosen at build time

## Context

Until 3.x every text a guest reads is German and written into the components, composables, validation schemas and server routes; the app's own paths are German too (`/bestellung/kasse`, `/konto`, `/registrierung`). A restaurant that serves guests in another language cannot use the storefront without forking it.

A shop is one restaurant in one place. Its guests read the language of its menu, which the restaurant maintains in its backend in one language. Several languages per shop (a switcher, `/en/...` prefixes, `hreflang`) would need translated menus, which no restaurant keeps, and double the paths that search engines, the quickstart's tests, uptime monitors and customer projects know.

## Decision

**A shop has exactly one locale. The shop's Nuxt project chooses it at build time; German stays the default, English ships as the second language.**

- **Option**: `shopBite.locale` in the shop's `nuxt.config.ts` (`NUXT_SHOPBITE_LOCALE` at build time takes precedence), next to `shopBite.preset`. It is not runtime config: it decides the route table and which messages are bundled, so it cannot change without a build. `modules/locale.ts` resolves it (`i18n/shopLocale.ts`) and refuses a locale without messages.
- **Messages**: [@nuxtjs/i18n](https://i18n.nuxtjs.org) with `strategy: "no_prefix"`, no browser detection and `bundle.onlyLocales` = the shop's locale, so a German shop carries no English message and the other way round. Messages live in `i18n/locales/<code>/<area>.json` (`common`, `menu`, `order`, `auth`, `account`, `contact`, `server`; the top-level key is the area). Templates and scripts use `t()` / `$t()`; validation schemas carry message keys that the form translates. Messages contain no HTML (`compilation.strictMessage`); links inside a sentence use `<i18n-t>`.
- **Paths**: the page files keep the German paths (shops override a page by its file path). Other locales move pages by route name in a `pages:extend` hook (`localizePages`), so route names stay and links by name (`{ name: "konto-profil" }`) follow the locale. English gets English paths; a locale the shop adds keeps the German ones unless it sets `shopBite.paths`. Route rules and robots.txt entries that name paths are generated per locale (`shopRouteRules`). Menu section paths are backend data and never translated by the storefront; the menu root's path, which the app links to from pages without a navigation, is a locale default (`/speisekarte/`, `/menu/`) that `shopBite.paths.menu` sets.
- **Formatting**: dates, times and prices are formatted with the locale's language tag (`i18n.locales[].language`: `de-DE`, `en-GB`), never the visitor's browser. Money keeps the backend's currency, times the restaurant's time zone (ADR 0001).
- **Errors**: BFF answers carry `data.code` (ADR 0001); the app renders the message for the code in the shop's language. The backend's message never reaches the guest.
- **Server texts**: server routes that write text for people (`/llms.txt`) translate with `useTranslation(event)` from the same messages; the locale detector always answers the shop's locale.
- **Backend data stays backend data**: menu, shipping and payment method names ("Lieferung", "Abholung"), sortings, filters and footer navigation come from the backend in whatever language the restaurant keeps them. The memory backend (a demo restaurant) seeds its shop setup (shipping and payment methods, sortings, filters, navigation, menu root, countries, its mails' paths) in the shop's locale; its demo menu stays the quickstart's German menu.
- **Protocols stay German**: the order comment `Wunschlieferzeit: HH:MM` / `Wunschabholzeit: HH:MM` is read by the receipt printer and the backoffice; query parameters (`produkt`, `ohne`, `extras`) and route names are identifiers.
- **Override by layer merge**: a shop overrides single messages in its own `i18n/locales/<code>.json` (registered in its `i18n.locales`); @nuxtjs/i18n merges it over the storefront's files. A shop adds a locale the same way plus `shopBite.locale`; messages it lacks fall back to English.
- **Guard**: German and English have the same keys, placeholders and plural forms, and no English message reads German (`test/unit/localeMessages.spec.ts`). ESLint refuses bare text in templates (`vue/no-bare-strings-in-template`) and German string literals in code (`shopbite/no-german-text`, a heuristic) outside the locale files, content and the adapters. An English build runs the main flows and finds no German on any page but the menu's data (`test/i18n`, CI job `english`).

## Why not @nuxtjs/i18n's own route localisation

Under `no_prefix` on one domain @nuxtjs/i18n leaves routes unlocalised (custom paths need a prefix strategy or different domains). `prefix_except_default` with a single locale would localise them, but renames every route (`konto___de`), which breaks route names in the app and in shops' overrides and adds routing plugins for a switch that never happens. The storefront's own hook keeps the routes of a German shop exactly as they are.

## Consequences

- A German shop builds and renders as in 3.x: the same texts, paths, route names, route rules and robots.txt.
- Every new text goes into both locale files; the parity test and the lint rule fail otherwise.
- A shop with another locale must configure what its backend sends with links of the storefront's paths (Shopware's double opt-in link is `/registrierung/bestaetigen` for German shops and `/register/confirm` for English ones).
- Changing a shop's locale changes its paths: a shop that switches needs redirects for the old ones.
