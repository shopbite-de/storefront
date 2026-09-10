# Issue #290: Adresse, Telefon, Öffnungszeiten und Google-Link im Footer

Stand 2026-09-10, Branch `feature/290-footer-nap`.

## Entscheidungen (mit Lirim abgestimmt)

- Daten über `runtimeConfig.public.site` (plattformneutral, per Env): `address.street`, `address.postalCode`, `address.city` (seit #274), `telephone`, `googleBusinessProfileUrl`. Dieselben Werte speisen später das `Restaurant`-Schema aus #272.
- Eigener Kontakt-Block oberhalb der Shopware-Footer-Navigation (nicht als zusätzliche Spalten), damit er unabhängig von der Spaltenzahl lesbar bleibt.
- Öffnungszeiten: aufeinanderfolgende Tage mit identischen Intervallen zusammengefasst, Tage ohne Zeiten als „Ruhetag“. Keine Feiertage/Schließtage im Footer.
- La Fattoria: nur Hinweis, keine Sonderlogik (siehe unten).

## Umsetzung

- `app/components/Footer/Contact.vue` (`<address>` für NAP, `<dl>` für Zeiten), eingebunden im `#top`-Slot von `Footer.vue`. Leere Werte werden ausgeblendet; ohne Kontaktdaten und ohne Öffnungszeiten rendert der Block nichts.
- `app/utils/openingHours.ts`: `groupOpeningHours` (Wochentage 1 = Mo … 7 = So, Sekunden abgeschnitten, Intervalle nach Öffnungszeit sortiert) und `toTelHref`.
- **SSR:** `useBusinessHours` hat `immediate: false`, `app.vue` lädt die Zeiten erst `onMounted` (Toast „geöffnet/geschlossen“). Damit die Zeiten im HTML stehen, ruft der Footer `onServerPrefetch(() => refresh())` auf. Die Daten landen unter dem Key `business-hours` im Payload, der Client hydratisiert damit, `app.vue` lädt beim Mount wie bisher neu. Kostet einen Store-API-Call pro SSR-Render.
- Tippfehler „Bestellsystm“ im Footer korrigiert.

## Stolperfallen

- Ein `mockNuxtImport("useRuntimeConfig")` ohne `app.baseURL` bricht das Router-Setup des Nuxt-Testenvironments (`useRouter()` undefined, siehe #294; `HeaderRight.test.ts` mockt mit `app.baseURL` und läuft). `test/nuxt/FooterContact.test.ts` setzt stattdessen die echte Runtime-Config per `Object.assign`.
- Nach einem Branch-Wechsel über #292 hinweg fehlte `@nuxtjs/sitemap` in `node_modules` (`nuxt prepare`: „Cannot resolve module“). `pnpm install --frozen-lockfile` nach jedem Wechsel auf einen neueren `main`.

## Nach dem Release für Pizzeria La Fattoria

- Env setzen: `NUXT_PUBLIC_SITE_ADDRESS_STREET="Kantstr. 6"`, `NUXT_PUBLIC_SITE_ADDRESS_POSTAL_CODE=63179`, `NUXT_PUBLIC_SITE_ADDRESS_CITY=Obertshausen`, `NUXT_PUBLIC_SITE_TELEPHONE`, `NUXT_PUBLIC_SITE_GOOGLE_BUSINESS_PROFILE_URL`.
- **Telefonnummer klären:** Impressum `+49 6104 71427`, Shopware-Footer-Navigation `tel:+491726723920`. Für NAP-Konsistenz eine Nummer, identisch mit dem Google Business Profil.
- Die Link-Kategorien „Kantstraße 6“ und „Tel: …“ im Shopware-Ordner „Unternehmen“ entfernen, sonst stehen Adresse und Telefon doppelt im Footer.
