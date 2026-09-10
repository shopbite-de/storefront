# Issue #274: Sitemap, Canonical, og:image, Title-Template

Stand 2026-09-10, Branch `feature/274-seo-sitemap-canonical-og`.

## Ausgangslage (live, pizzeria-lafattoria.de)

- `/sitemap.xml` 404, robots.txt ohne `Sitemap:`.
- Startseite: kein Canonical, kein `og:image`, `twitter:card: summary`.
- Kategorien (`/c/Pizza/`) hatten bereits Canonical, og:image und JSON-LD über `useCategorySeo`. Die Aussage im Issue, Kategorien hätten keine eigenen URLs, stimmte nicht.
- Produkte haben keine Seite. Shopware erzeugt trotzdem 390 SEO-URLs (`/Pizza-Margherita/21`), die 404 liefern.
- `nuxt.config.ts` setzte `og:title` auf die Beschreibung (Bug, behoben).

## Entscheidungen (mit Lirim abgestimmt)

- Scope: nur Sitemap, Canonical, og:image, Title-Template. Produktseiten → #289, Footer mit Adresse/Telefon/Öffnungszeiten → #290.
- Produkt-URLs später per Catch-all-Fallback in `[...all].vue` (steht in #289).
- og:image: statisches Bild über `site.ogImage`, kein `nuxt-og-image`.
- Ort/Küche (und später Adresse, Telefon) über `runtimeConfig.public.site`, nicht über die Plugin-Config.

## Umsetzung

- `@nuxtjs/sitemap` 8.5; Quellen: `/`, Content-Seiten (`defineSitemapSchema` in `landingpages`), `server/api/__sitemap__/urls.get.ts` (Navigation `main-navigation` + Menü-Kategoriebaum, flach mit `buildTree: false`, sonst fehlen Unterkategorien). App-Quellen `nuxt:pages` und `nuxt:route-rules` sind ausgeschlossen (Konto/Checkout, Route-Rules wie `/registrierung/bestaetigen`).
- `server/plugins/site-url.ts`: `storeUrl` wird zur nuxt-site-config-URL, damit Canonical, Sitemap und robots.txt dieselbe Basis haben (sonst Request-Origin, hinter Proxy intern).
- `app.vue`: Title-Template (Funktion, `%s`/`%siteName`), Canonical aus `route.path` (Key `canonical`, Kategorien überschreiben mit SEO-URL), `og:url`, `og:locale` aus dem Session-Kontext, Fallback-`og:image`, `summary_large_image`.
- Seitentitel ohne Shopnamen-Suffix; alle Seiten haben einen eigenen Titel. `error.vue` bleibt bei `404 | <Shopname>`, weil `app.vue` bei Fehlerseiten nicht gerendert wird (kein Template).
- `usePageSeo` für Startseite und Content-Seiten.

## Stolperfallen

- **Trailing Slash:** `@nuxtjs/sitemap` entfernt in `preNormalizeEntry` den abschließenden Schrägstrich aus jeder URL und setzt ihn nur global per `site.trailingSlash` wieder. Shopware-Kategorie-URLs (`/c/Pizza/`) liefern ohne Schrägstrich 404 (live geprüft), Produkt-URLs (`/Pizza-Margherita/21`) haben keinen. Ein globales `trailingSlash` passt daher nie. Lösung: Quelle markiert `_trailingSlash: true`, `server/plugins/sitemap-trailing-slash.ts` sammelt die Pfade in `sitemap:resolved` (pro Request in `event.context`) und hängt den Schrägstrich in `sitemap:output` wieder an. Die URL ohne Schrägstrich als 404 ist als #291 erfasst.
- Aus demselben Grund baut `toAbsoluteUrl` Canonicals mit `joinURL` statt `createSitePathResolver`, der Schrägstriche nach `site.trailingSlash` normalisiert.
- **Nuxt Content** füllt `seo.title`/`seo.description` automatisch mit `title`/`description`. Ein eigener SEO-Titel der Startseite ist daher nur erkennbar, wenn er sich von `title` unterscheidet; sonst greift `buildHomeTitle`.
- `@nuxtjs/sitemap` muss in `modules` vor `@nuxt/content` stehen, Content v3 braucht das `sitemap`-Schemafeld pro Collection.
- nuxt-site-config liest `runtimeConfig.public.site` komplett in seinen Stack; die zusätzlichen Keys (`titleTemplate`, `ogImage`, `cuisine`, `address`) stören nicht.

## Verifikation

Produktions-Build lokal gegen das La-Fattoria-Shopware (Store API, öffentlicher Access-Key) mit `NUXT_PUBLIC_STORE_URL=https://www.pizzeria-lafattoria.de`:

- robots.txt: `Sitemap: https://www.pizzeria-lafattoria.de/sitemap.xml`
- `/sitemap.xml` 200: Startseite, Content-Seiten, Kategorien inkl. Unterkategorien mit `/`, lastmod, Kategoriebilder
- Startseite, `/c/Pizza/`, `/c/Nudeln/Penne/`, `/agb`, `/anmelden`, `/bestellung/warenkorb`: je genau ein absolutes Canonical und ein absolutes `og:image`, individueller Titel

## Nach dem Release für Pizzeria La Fattoria

- `NUXT_PUBLIC_SITE_ADDRESS_CITY=Obertshausen`, `NUXT_PUBLIC_SITE_CUISINE` setzen.
- `seo.title`/`seo.description` in `content/index.yml` entfernen oder mit Suchbegriffen füllen (aktuell „Pizzeria La Fattoria Obertshausen“, hat Vorrang vor dem neuen Default).
- `public/card.png` ist vorhanden; auf 1200 × 630 px prüfen. Facebook Sharing Debugger laufen lassen.
- Das `robots.disallow` für `/impressum`, `/datenschutz`, `/agb` hält diese Seiten aus der Sitemap.
