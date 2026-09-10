# Issue #294: Matomo ohne Konfiguration lädt `cdn.matomo.cloud/undefined`

Stand 2026-09-10, Branch `fix/294-matomo-without-config`.

## Ursache

- `$production.scripts.registry.matomoAnalytics: { trigger: "onNuxtReady" }` ließ das von `@nuxt/scripts` generierte Plugin `useScriptMatomoAnalytics()` auf jeder Seite aufrufen, unabhängig von der Konfiguration.
- Die Registry-Implementierung (`runtime/registry/matomo-analytics.js`, 1.3.9) nimmt ohne `matomoUrl` die Matomo-Cloud: `https://cdn.matomo.cloud/${cloudId}/`. Ohne `cloudId` wird daraus `.../undefined/matomo.js`.
- `useTrackEvent` rief `useScriptMatomoAnalytics()` ebenfalls bedingungslos auf. Im Dev-Server (dort gab es keinen Registry-Eintrag) wurde das Skript damit beim ersten Tracking-Aufruf mit Default-Trigger `client` geladen.
- Folge ohne Matomo-Env (Demo-Shops, neue Kunden): 404 in der Konsole und ein Request mit Besucher-IP an einen Drittanbieter ohne Einwilligung.

## Lösung

- Registry-Eintrag entfernt. `app/composables/useMatomo.ts` erzeugt das Skript nur, wenn `matomoUrl` und `siteId` in `runtimeConfig.public.scripts.matomoAnalytics` gesetzt sind, sonst `null`.
- `app/plugins/matomo.ts` (universell, damit der Preload im SSR-HTML bleibt) ruft `useMatomo()` auf jeder Seite auf, das ersetzt das generierte Registry-Plugin inkl. Seitenaufruf-Tracking.
- `useTrackEvent` pusht über `useMatomo()?.proxy._paq`, ohne Konfiguration ist Tracking ein No-op.
- Keine Optionswerte werden übergeben: `useRegistryScript` merged `runtimeConfig.public.scripts.matomoAnalytics` selbst per `defu`. Plugin und `useTrackEvent` erhalten dadurch dieselbe Script-Instanz (gleicher Key, gleiche `src`). Die Regel aus #259 gilt weiter: keine Platzhalterwerte in Optionen, die ins Build inlined werden.

## Stolperfallen

- Build-Warnung `env var NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_MATOMO_URL is set but matomoAnalytics is not registered in scripts.registry` ist ein False Positive: Der Validator von `@nuxt/scripts` prüft nur den Registry-Eintrag. Die Werte kommen trotzdem über `runtimeConfig.public.scripts.matomoAnalytics` an (siehe Verifikation).
- `mockNuxtImport("useRuntimeConfig")` bricht das Nuxt-Testenvironment (`useRouter()` in `@nuxt/test-utils` ist dann `undefined`). `test/nuxt/useTrackEvent.test.ts` setzt deshalb die echte Runtime-Config.

## Verifikation

Produktions-Build lokal gegen die La-Fattoria-Store-API, drei Szenarien, Playwright zeichnet alle Requests mit `matomo` auf:

- Ohne Matomo-Env und nur mit `MATOMO_URL`: keine `matomo.js`-Referenz im SSR-HTML, kein Request (weder `cdn.matomo.cloud` noch sonst).
- Mit URL + Site-ID: Preload und Request auf `<matomoUrl>/matomo.js`, `_paq` enthält `setTrackerUrl`, `setSiteId`, `trackPageView`. Clientseitige Suche von `/c/Pizza/` nach `/suche?q=salat` pusht `trackSiteSearch` über dieselbe Instanz (nur ein Skript-Request).

## Verhaltensänderung

Matomo hängt nur noch an der Konfiguration, nicht mehr an `$production`. Ein Dev-Server mit vollständiger Matomo-Env lädt Matomo also ab dem ersten Seitenaufruf (vorher erst beim ersten Tracking-Event).
