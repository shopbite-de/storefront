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
- **Messages**: vue-i18n's message format, compiled at build time and shipped with the bundle. Messages live in `i18n/locales/<code>/<area>.json` (`common`, `menu`, `order`, `auth`, `account`, `contact`, `server`; the top-level key is the area). `modules/locale.ts` merges every layer's files of the shop's locale (`i18n/messages.ts`), compiles them with `@intlify/message-compiler` into message ASTs (texts without placeholders stay strings) and writes them into the app and server bundles (`#shopbite-messages`): a German shop carries no English message and the other way round, the browser makes no request for messages and runs no message compiler. `i18n/runtime/` evaluates them with vue-i18n's message engine (`@intlify/core-base`, built without the compiler): `$t()` in templates, `useI18n().t` in scripts, `<i18n-t>` with a slot per placeholder for links inside a sentence. Validation schemas carry message keys that the form translates. A message with HTML or a linked message (`@:key`) fails the build.
- **Paths**: the page files keep the German paths (shops override a page by its file path). Other locales move pages by route name in a `pages:extend` hook (`localizePages`), so route names stay and links by name (`{ name: "konto-profil" }`) follow the locale. English gets English paths; a locale the shop adds keeps the German ones unless it sets `shopBite.paths`. Route rules and robots.txt entries that name paths are generated per locale (`shopRouteRules`). Menu section paths are backend data and never translated by the storefront; the menu root's path, which the app links to from pages without a navigation, is a locale default (`/speisekarte/`, `/menu/`) that `shopBite.paths.menu` sets.
- **Formatting**: dates, times and prices are formatted with the locale's language tag (`i18n.locales[].language`: `de-DE`, `en-GB`), never the visitor's browser. Money keeps the backend's currency, times the restaurant's time zone (ADR 0001).
- **Errors**: BFF answers carry `data.code` (ADR 0001); the app renders the message for the code in the shop's language. The backend's message never reaches the guest. The same holds for the cart's messages: a refused voucher (`voucher_invalid`) reads `order.voucher.invalid`; a `CartMessage.text` is the backend's, in the backend's language, and at most a fallback for a code the storefront has no message for.
- **Server texts**: server routes that write text for people (`/llms.txt`) translate with `shopTranslate()`, the app's translator on the same compiled messages.
- **Backend data stays backend data**: menu, shipping and payment method names ("Lieferung", "Abholung"), sortings, filters and footer navigation come from the backend in whatever language the restaurant keeps them. The memory backend (a demo restaurant) seeds its shop setup (shipping and payment methods, sortings, filters, navigation, menu root, countries, its mails' paths) in the shop's locale; its demo menu stays the quickstart's German menu.
- **Protocols stay German**: the order comment `Wunschlieferzeit: HH:MM` / `Wunschabholzeit: HH:MM` is read by the receipt printer and the backoffice; query parameters (`produkt`, `ohne`, `extras`) and route names are identifiers.
- **Override by layer merge**: a shop overrides single messages in its own `i18n/locales/<code>.json` (or `<code>/*.json`); the build merges it over the storefront's files. A shop adds a locale the same way plus `shopBite.locale` and `shopBite.language` (its language tag, e.g. `nl-NL`); messages it lacks fall back to English, which the build then bundles too.
- **Guard**: German and English have the same keys, placeholders and plural forms, and no English message reads German (`test/unit/localeMessages.spec.ts`). No page shows a message key or an unfilled placeholder, in the server's HTML or after hydration, in a German and an English build (`test/i18n/messages.spec.ts`). ESLint refuses bare text in templates (`vue/no-bare-strings-in-template`) and German string literals in code (`shopbite/no-german-text`, a heuristic) outside the locale files, content and the adapters. An English build runs the main flows and finds no German on any page but the menu's data (`test/i18n`, CI job `english`).

## Why not @nuxtjs/i18n

The first version of this ADR used @nuxtjs/i18n 10. With one locale per shop most of it has nothing to do (detection, switching, prefixes, lazy loading), and what it does do cost the guest: the browser fetched the messages from `/_i18n/<hash>/<code>/messages.json` after the bundle and compiled them at runtime, since the runtime-only build without the message compiler rendered every message with a placeholder raw after hydration. The home page loaded about 27 KB more JS gzip than 3.x, plus that request.

The storefront now compiles the messages at build time and evaluates them with vue-i18n's own engine. It keeps vue-i18n's message format (placeholders, plurals, `{'@'}` escapes), its compiler and its runtime semantics (fallback chain, plural rules, `<i18n-t>`), but not the Vue layer around it (`createI18n`, the Composer with reactive locales, datetime and number formats, devtools), which a fixed locale does not need. That layer would add another 6 KB gzip.

Measured on the home page of the German build with one method (every `/_nuxt/*.js` the page references, gzip -9, KB of 1024 bytes):

| Build                                     | JS gzip  | Chunks | Delta   |
| ----------------------------------------- | -------- | ------ | ------- |
| 3.x (main)                                | 141.4 KB | 35     |         |
| @nuxtjs/i18n (plus a 25 KB messages JSON) | 168.3 KB | 37     | +27.0   |
| vue-i18n `createI18n`, bundled messages   | 163.7 KB | 37     | +22.3   |
| vue-i18n's engine, bundled messages       | 157.6 KB | 37     | +16.2   |

Of the +16.2 KB, the compiled German messages are 8.0 KB and the engine with the storefront's glue 7.9 KB.

## Why not @nuxtjs/i18n's own route localisation

Under `no_prefix` on one domain @nuxtjs/i18n leaves routes unlocalised (custom paths need a prefix strategy or different domains). `prefix_except_default` with a single locale would localise them, but renames every route (`konto___de`), which breaks route names in the app and in shops' overrides and adds routing plugins for a switch that never happens. The storefront's own hook keeps the routes of a German shop exactly as they are.

## Consequences

- A German shop builds and renders as in 3.x: the same texts, paths, route names, route rules and robots.txt.
- Every new text goes into both locale files; the parity test and the lint rule fail otherwise.
- The messages are part of the JS bundle: about 8 KB gzip for the German messages of 3.x, growing with every text.
- A shop with another locale must configure what its backend sends with links of the storefront's paths (Shopware's double opt-in link is `/registrierung/bestaetigen` for German shops and `/register/confirm` for English ones).
- Changing a shop's locale changes its paths: a shop that switches needs redirects for the old ones.
