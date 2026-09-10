# Issue #291: SEO-URLs ohne bzw. mit überzähligem Schrägstrich

Stand 2026-09-10, Branch `fix/291-seo-url-trailing-slash`.

## Ursache

`c/[...all].vue` und `speisekarte/[...all].vue` lösen den Pfad über `useNavigationSearch().resolvePath` auf. Das filtert `/store-api/seo-url` exakt auf `seoPathInfo`. Shopware speichert Kategorie-URLs mit Schrägstrich (`c/Pizza/`), Produkt-URLs ohne (`Pizza-Margherita/21`). Der Fallback `getRouteFromPathInfo` aus `@shopware/helpers` greift nur für technische Pfade (`/navigation/<id>`, `/detail/<id>`, ...) und liefert sonst `null`. Ergebnis: `/c/Pizza` → 404 (live geprüft).

## Lösung

- `app/utils/seoPath.ts` → `resolveSeoPath(path, resolve)`: exakter Lookup, bei Fehlschlag genau ein zweiter Lookup mit umgekehrtem Schrägstrich. Treffer liefern `redirectPath` aus `seoPathInfo` (nicht den umgedrehten Pfad), damit immer auf die SEO-URL aus dem Backend geleitet wird. Treffer ohne `seoPathInfo` (technische Routen) zählen nicht, `/` wird nicht umgedreht.
- `app/composables/useSeoUrlRoute.ts` bündelt Auflösung, 404 und `navigateTo(..., { redirectCode: 301, replace: true })` inkl. Query-Parametern. Beide Kategorie-Seiten nutzen es; die Produktseiten aus #289 können es für ihre URLs wiederverwenden.
- Der `useAsyncData`-Wert hat jetzt die Form `{ seoUrl, redirectPath }` (Key unverändert `cmsResponse<path>`).
- Nebenbei: verirrtes `H` vor `<script>` in `speisekarte/[...all].vue` entfernt.

## Kosten

Nur Pfade, die nicht exakt treffen, lösen einen zweiten Store-API-Call aus (unbekannte Pfade von Bots: 2 statt 1 Call, danach 404).

## Nicht abgedeckt

- Nicht-kanonische SEO-URLs (alte URLs nach Umbenennung, `isCanonical: false`) werden weiterhin ausgeliefert statt auf die kanonische umgeleitet.
- Technische URLs (`/navigation/<id>`) werden nicht auf ihre SEO-URL umgeleitet; `@shopware/helpers` bietet dafür `getCanonicalPathForTechnicalPath`.
